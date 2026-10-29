import "reflect-metadata";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { TreeRole } from "@family-tree/shared-types";
import type { PrismaService } from "../database/prisma.service.js";
import type { MailService } from "../mail/mail.service.js";
import { MembershipsService } from "./memberships.service.js";
import { hashInvitationToken } from "./invitation-token.js";

type FakeMembership = {
  treeId: string;
  userId: string;
  role: TreeRole;
  personId: string | null;
};
type FakeInvitation = {
  id: string;
  treeId: string;
  tokenHash: string;
  role: TreeRole;
  maxUses: number | null;
  useCount: number;
  expiresAt: Date;
  revokedAt: Date | null;
  email: string | null;
  personId: string | null;
  createdById: string;
  createdAt: Date;
};
type TreeUserKey = { treeId_userId: { treeId: string; userId: string } };
type TreePersonKey = { treeId_personId: { treeId: string; personId: string } };

const TREE = "tree-1";
const users = [
  { id: "admin", email: "nhat@example.com", emailVerifiedAt: new Date() },
  { id: "viewer", email: "viewer@example.com", emailVerifiedAt: new Date() },
  { id: "binh", email: "binh@example.com", emailVerifiedAt: new Date() },
  { id: "other", email: "other@example.com", emailVerifiedAt: new Date() },
  { id: "unverified", email: "binh2@example.com", emailVerifiedAt: null },
];
const persons = [
  { id: "p-binh", fullName: "Phạm Văn Bình" },
  { id: "p-an", fullName: "Phạm Thị An" },
];

/** Prisma giả trong bộ nhớ, chỉ đủ các truy vấn MembershipsService dùng. */
function fakePrisma() {
  const memberships: FakeMembership[] = [];
  const invitations: FakeInvitation[] = [];
  const byTreeUser = ({ treeId_userId: k }: TreeUserKey) =>
    memberships.find((m) => m.treeId === k.treeId && m.userId === k.userId) ??
    null;
  const personOf = (id: string | null) =>
    persons.find((p) => p.id === id) ?? null;
  const withRelations = (invitation: FakeInvitation) => ({
    ...invitation,
    tree: {
      id: TREE,
      name: "Họ Phạm",
      coverUrl: null,
      originPlace: "Nam Định",
      _count: { persons: 12 },
    },
    createdBy: { id: invitation.createdById, name: "Nhật" },
    person: personOf(invitation.personId),
  });
  const invitation = {
    fields: { maxUses: "maxUses" },
    async create({ data }: { data: Partial<FakeInvitation> }) {
      const row = {
        ...data,
        id: `inv-${invitations.length + 1}`,
        useCount: 0,
        revokedAt: null,
        createdAt: new Date(),
      } as FakeInvitation;
      invitations.push(row);
      return withRelations(row);
    },
    async findUnique({ where }: { where: { tokenHash: string } }) {
      const row = invitations.find((i) => i.tokenHash === where.tokenHash);
      return row ? withRelations(row) : null;
    },
    async findFirst({ where }: { where: { id: string; treeId: string } }) {
      return (
        invitations.find(
          (i) => i.id === where.id && i.treeId === where.treeId,
        ) ?? null
      );
    },
    async update({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeInvitation>;
    }) {
      const row = invitations.find((i) => i.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
    async delete({ where }: { where: { id: string } }) {
      invitations.splice(
        invitations.findIndex((i) => i.id === where.id),
        1,
      );
    },
    async updateMany({
      where,
      data,
    }: {
      where: { id: string | { not: string }; email?: string };
      data: Partial<FakeInvitation> & { useCount?: unknown };
    }) {
      // Thu hồi lời mời cũ cùng email
      if (where.email) {
        const rows = invitations.filter(
          (i) =>
            i.email === where.email &&
            i.id !== (where.id as { not: string }).not &&
            !i.revokedAt,
        );
        rows.forEach((row) => (row.revokedAt = data.revokedAt!));
        return { count: rows.length };
      }
      // Tăng lượt dùng
      const row = invitations.find((i) => i.id === where.id);
      const usable =
        row &&
        !row.revokedAt &&
        row.expiresAt > new Date() &&
        (row.maxUses === null || row.useCount < row.maxUses);
      if (!usable) return { count: 0 };
      row.useCount += 1;
      return { count: 1 };
    },
  };
  const membership = {
    async findUnique({ where }: { where: TreeUserKey | TreePersonKey }) {
      if ("treeId_userId" in where) return byTreeUser(where);
      const k = where.treeId_personId;
      return (
        memberships.find(
          (m) => m.treeId === k.treeId && m.personId === k.personId,
        ) ?? null
      );
    },
    async findFirst({
      where,
    }: {
      where: { treeId: string; user: { email: string } };
    }) {
      const user = users.find((u) => u.email === where.user.email);
      return (
        memberships.find(
          (m) => m.treeId === where.treeId && m.userId === user?.id,
        ) ?? null
      );
    },
    async upsert({
      where,
      create,
    }: {
      where: TreeUserKey;
      create: Omit<FakeMembership, "personId">;
    }) {
      const existing = byTreeUser(where);
      if (existing) return existing;
      const row = { ...create, personId: null };
      memberships.push(row);
      return row;
    },
    async update({
      where,
      data,
    }: {
      where: TreeUserKey;
      data: Partial<FakeMembership>;
    }) {
      return Object.assign(byTreeUser(where)!, data);
    },
    async delete({ where }: { where: TreeUserKey }) {
      memberships.splice(memberships.indexOf(byTreeUser(where)!), 1);
    },
  };
  const familyTreePerson = {
    async findUnique({ where }: { where: TreePersonKey }) {
      return personOf(where.treeId_personId.personId);
    },
  };
  const user = {
    async findUnique({ where }: { where: { id: string } }) {
      return users.find((u) => u.id === where.id) ?? null;
    },
  };
  const tx = { membership, invitation, familyTreePerson, user };
  const prisma = {
    ...tx,
    $transaction: <T>(run: (client: unknown) => Promise<T>) => run(tx),
  };
  return { prisma, memberships, invitations };
}

function fakeMail() {
  const sent: Array<{ email: string; url: string; personName: string | null }> =
    [];
  return {
    sent,
    fail: false,
    async sendTreeInvitation(input: (typeof sent)[number]) {
      if (this.fail) throw new Error("SMTP down");
      sent.push(input);
    },
  };
}

const tokenFromUrl = (url: string) => url.split("/invite/")[1]!;

describe("MembershipsService", () => {
  let db: ReturnType<typeof fakePrisma>;
  let mail: ReturnType<typeof fakeMail>;
  let service: MembershipsService;

  beforeEach(() => {
    db = fakePrisma();
    mail = fakeMail();
    db.memberships.push(
      { treeId: TREE, userId: "admin", role: "ADMIN", personId: null },
      { treeId: TREE, userId: "viewer", role: "VIEWER", personId: null },
    );
    service = new MembershipsService(
      db.prisma as unknown as PrismaService,
      mail as unknown as MailService,
    );
  });

  const createLink = async (maxUses?: number) => {
    const created = await service.createInvitation(TREE, "admin", { maxUses });
    return { ...created, token: created.token! };
  };

  describe("tạo link chung", () => {
    it("Admin tạo link Viewer, hạn mặc định 7 ngày, token chỉ lưu dạng hash", async () => {
      const created = await createLink();
      assert.equal(created.role, "VIEWER");
      assert.equal(created.status, "ACTIVE");
      assert.equal(created.email, null);
      const days =
        (new Date(created.expiresAt).getTime() - Date.now()) / 86_400_000;
      assert.ok(days > 6.99 && days <= 7);
      assert.equal(
        db.invitations[0]!.tokenHash,
        hashInvitationToken(created.token),
      );
      assert.ok(!JSON.stringify(db.invitations).includes(created.token));
      assert.equal(mail.sent.length, 0);
    });

    it("Viewer không tạo được lời mời (403)", async () => {
      await assert.rejects(
        service.createInvitation(TREE, "viewer", {}),
        ForbiddenException,
      );
    });

    it("người ngoài gia phả nhận 404", async () => {
      await assert.rejects(
        service.createInvitation(TREE, "stranger", {}),
        NotFoundException,
      );
    });

    it("gắn Person mà không có email thì bị từ chối", async () => {
      await assert.rejects(
        service.createInvitation(TREE, "admin", { personId: "p-binh" }),
        BadRequestException,
      );
    });
  });

  describe("xem trước và chấp nhận link chung", () => {
    it("xem trước không cần đăng nhập và không lộ id gia phả", async () => {
      const { token } = await createLink();
      const preview = await service.preview(token);
      assert.equal(preview.tree.name, "Họ Phạm");
      assert.equal(preview.invitedBy.name, "Nhật");
      assert.equal(preview.emailHint, null);
      assert.ok(!("id" in preview.tree));
    });

    it("token sai trả 404", async () => {
      await assert.rejects(service.preview("khong-ton-tai"), NotFoundException);
    });

    it("người mới chấp nhận thì thành Viewer và tăng lượt dùng", async () => {
      const { token } = await createLink();
      const result = await service.accept(token, "binh");
      assert.deepEqual(result, {
        treeId: TREE,
        role: "VIEWER",
        alreadyMember: false,
      });
      assert.equal(db.invitations[0]!.useCount, 1);
    });

    it("đã là thành viên thì giữ vai trò cũ, không tốn lượt", async () => {
      const { token } = await createLink(1);
      const result = await service.accept(token, "admin");
      assert.deepEqual(result, {
        treeId: TREE,
        role: "ADMIN",
        alreadyMember: true,
      });
      assert.equal(db.invitations[0]!.useCount, 0);
    });

    it("hết lượt thì người tiếp theo nhận 410", async () => {
      const { token } = await createLink(1);
      await service.accept(token, "binh");
      await assert.rejects(service.accept(token, "other"), (error) => {
        assert.ok(error instanceof GoneException);
        assert.equal(
          (error.getResponse() as { code: string }).code,
          "INVITATION_EXHAUSTED",
        );
        return true;
      });
    });

    it("đã thu hồi thì không dùng được (410)", async () => {
      const { id, token } = await createLink();
      await service.revokeInvitation(TREE, id, "admin");
      await assert.rejects(service.accept(token, "binh"), GoneException);
      assert.equal((await service.preview(token)).status, "REVOKED");
    });

    it("hết hạn thì không dùng được (410)", async () => {
      const { token } = await createLink();
      db.invitations[0]!.expiresAt = new Date(Date.now() - 1000);
      await assert.rejects(service.accept(token, "binh"), GoneException);
    });
  });

  describe("mời qua email", () => {
    it("gửi email, không trả token, chỉ dùng được một lần", async () => {
      const created = await service.createInvitation(TREE, "admin", {
        email: "  Binh@Example.com ",
        maxUses: 50,
      });
      assert.equal(created.token, null);
      assert.equal(created.email, "binh@example.com");
      assert.equal(created.maxUses, 1);
      assert.equal(mail.sent.length, 1);
      assert.equal(mail.sent[0]!.email, "binh@example.com");
      assert.match(mail.sent[0]!.url, /\/invite\/[A-Za-z0-9_-]{43}$/);
    });

    it("đúng email thì vào được và gắn với Person", async () => {
      await service.createInvitation(TREE, "admin", {
        email: "binh@example.com",
        personId: "p-binh",
      });
      const token = tokenFromUrl(mail.sent[0]!.url);
      const preview = await service.preview(token);
      assert.equal(preview.emailHint, "bi***@example.com");
      assert.equal(preview.person?.fullName, "Phạm Văn Bình");

      await service.accept(token, "binh");
      const membership = db.memberships.find((m) => m.userId === "binh");
      assert.equal(membership?.role, "VIEWER");
      assert.equal(membership?.personId, "p-binh");
    });

    it("sai email thì bị chặn (403) và không tốn lượt", async () => {
      await service.createInvitation(TREE, "admin", {
        email: "binh@example.com",
      });
      const token = tokenFromUrl(mail.sent[0]!.url);
      await assert.rejects(service.accept(token, "other"), (error) => {
        assert.ok(error instanceof ForbiddenException);
        assert.match(
          (error.getResponse() as { message: string }).message,
          /bi\*\*\*@example\.com/,
        );
        return true;
      });
      assert.equal(db.invitations[0]!.useCount, 0);
    });

    it("email chưa xác minh thì bị chặn (403)", async () => {
      await service.createInvitation(TREE, "admin", {
        email: "binh2@example.com",
      });
      await assert.rejects(
        service.accept(tokenFromUrl(mail.sent[0]!.url), "unverified"),
        ForbiddenException,
      );
    });

    it("mời lại cùng email thì link cũ bị thu hồi", async () => {
      await service.createInvitation(TREE, "admin", {
        email: "binh@example.com",
      });
      await service.createInvitation(TREE, "admin", {
        email: "binh@example.com",
      });
      const [oldToken, newToken] = mail.sent.map((m) => tokenFromUrl(m.url));
      await assert.rejects(service.accept(oldToken!, "binh"), GoneException);
      await service.accept(newToken!, "binh");
    });

    it("gửi email lỗi thì không để lại lời mời (503)", async () => {
      mail.fail = true;
      await assert.rejects(
        service.createInvitation(TREE, "admin", { email: "binh@example.com" }),
        ServiceUnavailableException,
      );
      assert.equal(db.invitations.length, 0);
    });

    it("không mời được người đã ở trong gia phả nếu không kèm hồ sơ", async () => {
      await assert.rejects(
        service.createInvitation(TREE, "admin", {
          email: "viewer@example.com",
        }),
        ConflictException,
      );
    });

    it("người đã vào bằng link chung được mời lại để gắn hồ sơ, giữ vai trò cũ", async () => {
      await service.createInvitation(TREE, "admin", {
        email: "viewer@example.com",
        personId: "p-binh",
      });
      const result = await service.accept(
        tokenFromUrl(mail.sent[0]!.url),
        "viewer",
      );
      assert.deepEqual(result, {
        treeId: TREE,
        role: "VIEWER",
        alreadyMember: true,
      });
      assert.equal(db.memberships[1]!.personId, "p-binh");
      assert.equal(db.invitations[0]!.useCount, 1);
    });

    it("không gắn hồ sơ cho tài khoản đã gắn hồ sơ khác (409)", async () => {
      db.memberships[1]!.personId = "p-an";
      await assert.rejects(
        service.createInvitation(TREE, "admin", {
          email: "viewer@example.com",
          personId: "p-binh",
        }),
        (error) => {
          assert.ok(error instanceof ConflictException);
          assert.equal(
            (error.getResponse() as { code: string }).code,
            "MEMBER_ALREADY_LINKED",
          );
          return true;
        },
      );
      assert.equal(mail.sent.length, 0);
    });

    it("không mời gắn vào hồ sơ đã có tài khoản khác", async () => {
      db.memberships[1]!.personId = "p-an";
      await assert.rejects(
        service.createInvitation(TREE, "admin", {
          email: "binh@example.com",
          personId: "p-an",
        }),
        ConflictException,
      );
    });

    it("hồ sơ bị người khác nhận trước thì người nhận vẫn vào được, chỉ không gắn", async () => {
      await service.createInvitation(TREE, "admin", {
        email: "binh@example.com",
        personId: "p-an",
      });
      db.memberships[1]!.personId = "p-an";
      await service.accept(tokenFromUrl(mail.sent[0]!.url), "binh");
      const membership = db.memberships.find((m) => m.userId === "binh");
      assert.equal(membership?.personId, null);
    });
  });

  describe("xóa người truy cập", () => {
    it("Admin xóa được Viewer", async () => {
      await service.removeMember(TREE, "viewer", "admin");
      assert.equal(db.memberships.length, 1);
    });

    it("Viewer tự rời gia phả được", async () => {
      await service.removeMember(TREE, "viewer", "viewer");
      assert.equal(db.memberships.length, 1);
    });

    it("Viewer không xóa được người khác (403)", async () => {
      db.memberships.push({
        treeId: TREE,
        userId: "binh",
        role: "VIEWER",
        personId: null,
      });
      await assert.rejects(
        service.removeMember(TREE, "binh", "viewer"),
        ForbiddenException,
      );
    });

    it("không xóa được trưởng họ", async () => {
      await assert.rejects(
        service.removeMember(TREE, "admin", "admin"),
        BadRequestException,
      );
    });
  });
});
