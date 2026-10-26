import "reflect-metadata";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from "@nestjs/common";
import type { TreeRole } from "@family-tree/shared-types";
import type { PrismaService } from "../database/prisma.service.js";
import { MembershipsService } from "./memberships.service.js";
import { hashInvitationToken } from "./invitation-token.js";

type FakeMembership = { treeId: string; userId: string; role: TreeRole };
type FakeInvitation = {
  id: string;
  treeId: string;
  tokenHash: string;
  role: TreeRole;
  maxUses: number | null;
  useCount: number;
  expiresAt: Date;
  revokedAt: Date | null;
  createdById: string;
  createdAt: Date;
};

const TREE = "tree-1";
const key = (where: { treeId_userId: { treeId: string; userId: string } }) =>
  where.treeId_userId;

/** Prisma giả trong bộ nhớ, chỉ đủ các truy vấn MembershipsService dùng. */
function fakePrisma() {
  const memberships: FakeMembership[] = [];
  const invitations: FakeInvitation[] = [];
  const findMembership = (where: Parameters<typeof key>[0]) =>
    memberships.find(
      (m) => m.treeId === key(where).treeId && m.userId === key(where).userId,
    ) ?? null;
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
  });
  const invitation = {
    fields: { maxUses: "maxUses" },
    async create({
      data,
    }: {
      data: Omit<FakeInvitation, "id" | "useCount" | "revokedAt" | "createdAt">;
    }) {
      const row: FakeInvitation = {
        ...data,
        id: `inv-${invitations.length + 1}`,
        useCount: 0,
        revokedAt: null,
        createdAt: new Date(),
      };
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
    async updateMany({ where }: { where: { id: string } }) {
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
    async findUnique({ where }: { where: Parameters<typeof key>[0] }) {
      return findMembership(where);
    },
    async upsert({
      where,
      create,
    }: {
      where: Parameters<typeof key>[0];
      create: FakeMembership;
    }) {
      const existing = findMembership(where);
      if (existing) return existing;
      memberships.push(create);
      return create;
    },
    async delete({ where }: { where: Parameters<typeof key>[0] }) {
      memberships.splice(memberships.indexOf(findMembership(where)!), 1);
    },
  };
  const prisma = {
    membership,
    invitation,
    $transaction: <T>(run: (tx: unknown) => Promise<T>) =>
      run({ membership, invitation }),
  };
  return { prisma, memberships, invitations };
}

describe("MembershipsService", () => {
  let db: ReturnType<typeof fakePrisma>;
  let service: MembershipsService;

  beforeEach(() => {
    db = fakePrisma();
    db.memberships.push(
      { treeId: TREE, userId: "admin", role: "ADMIN" },
      { treeId: TREE, userId: "viewer", role: "VIEWER" },
    );
    service = new MembershipsService(db.prisma as unknown as PrismaService);
  });

  describe("tạo lời mời", () => {
    it("Admin tạo link Viewer, hạn mặc định 7 ngày, token chỉ lưu dạng hash", async () => {
      const created = await service.createInvitation(TREE, "admin", {});
      assert.equal(created.role, "VIEWER");
      assert.equal(created.status, "ACTIVE");
      const days =
        (new Date(created.expiresAt).getTime() - Date.now()) / 86_400_000;
      assert.ok(days > 6.99 && days <= 7);
      assert.equal(
        db.invitations[0]!.tokenHash,
        hashInvitationToken(created.token),
      );
      assert.ok(!JSON.stringify(db.invitations).includes(created.token));
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
  });

  describe("xem trước và chấp nhận", () => {
    it("xem trước không cần đăng nhập và không lộ id gia phả", async () => {
      const { token } = await service.createInvitation(TREE, "admin", {});
      const preview = await service.preview(token);
      assert.equal(preview.tree.name, "Họ Phạm");
      assert.equal(preview.invitedBy.name, "Nhật");
      assert.ok(!("id" in preview.tree));
    });

    it("token sai trả 404", async () => {
      await assert.rejects(service.preview("khong-ton-tai"), NotFoundException);
    });

    it("người mới chấp nhận thì thành Viewer và tăng lượt dùng", async () => {
      const { token } = await service.createInvitation(TREE, "admin", {});
      const result = await service.accept(token, "newbie");
      assert.deepEqual(result, {
        treeId: TREE,
        role: "VIEWER",
        alreadyMember: false,
      });
      assert.equal(db.invitations[0]!.useCount, 1);
    });

    it("đã là thành viên thì giữ vai trò cũ, không tốn lượt", async () => {
      const { token } = await service.createInvitation(TREE, "admin", {
        maxUses: 1,
      });
      const result = await service.accept(token, "admin");
      assert.deepEqual(result, {
        treeId: TREE,
        role: "ADMIN",
        alreadyMember: true,
      });
      assert.equal(db.invitations[0]!.useCount, 0);
    });

    it("hết lượt thì người tiếp theo nhận 410", async () => {
      const { token } = await service.createInvitation(TREE, "admin", {
        maxUses: 1,
      });
      await service.accept(token, "user-a");
      await assert.rejects(service.accept(token, "user-b"), (error) => {
        assert.ok(error instanceof GoneException);
        assert.equal(
          (error.getResponse() as { code: string }).code,
          "INVITATION_EXHAUSTED",
        );
        return true;
      });
    });

    it("đã thu hồi thì không dùng được (410)", async () => {
      const { id, token } = await service.createInvitation(TREE, "admin", {});
      await service.revokeInvitation(TREE, id, "admin");
      await assert.rejects(service.accept(token, "newbie"), GoneException);
      assert.equal((await service.preview(token)).status, "REVOKED");
    });

    it("hết hạn thì không dùng được (410)", async () => {
      const { token } = await service.createInvitation(TREE, "admin", {});
      db.invitations[0]!.expiresAt = new Date(Date.now() - 1000);
      await assert.rejects(service.accept(token, "newbie"), GoneException);
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
      db.memberships.push({ treeId: TREE, userId: "viewer-2", role: "VIEWER" });
      await assert.rejects(
        service.removeMember(TREE, "viewer-2", "viewer"),
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
