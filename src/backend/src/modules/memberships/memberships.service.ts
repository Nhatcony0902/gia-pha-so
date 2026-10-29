import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Invitation, Person, Prisma, User } from "@prisma/client";
import type {
  AcceptInvitationResponse,
  CreatedTreeInvitation,
  InvitationPreview,
  TreeInvitation,
  TreeInvitationListResponse,
  TreeMemberListResponse,
} from "@family-tree/shared-types";
import { PrismaService } from "../database/prisma.service.js";
import { MailService } from "../mail/mail.service.js";
import type { CreateInvitationDto } from "./memberships.dto.js";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationStatus,
  maskEmail,
} from "./invitation-token.js";

const DEFAULT_EXPIRES_IN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const invitationInclude = {
  createdBy: { select: { id: true, name: true } },
  person: { select: { id: true, fullName: true } },
} as const;

const webOrigin = () => process.env.WEB_ORIGIN ?? "http://localhost:5173";

const unusableInvitation = {
  EXPIRED: "Lời mời đã hết hạn. Hãy nhờ trưởng họ gửi link mới",
  REVOKED: "Lời mời đã bị thu hồi",
  EXHAUSTED: "Lời mời đã hết lượt sử dụng",
} as const;

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  private async assertAdmin(treeId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { treeId_userId: { treeId, userId } },
    });
    if (!membership)
      throw new NotFoundException({
        code: "TREE_NOT_FOUND",
        message: "Không tìm thấy gia phả",
      });
    if (membership.role !== "ADMIN")
      throw new ForbiddenException({
        code: "TREE_ADMIN_REQUIRED",
        message: "Chỉ trưởng họ mới quản lý được người truy cập",
      });
  }

  private invitationView(
    invitation: Invitation & {
      createdBy: Pick<User, "id" | "name">;
      person: Pick<Person, "id" | "fullName"> | null;
    },
  ): TreeInvitation {
    return {
      id: invitation.id,
      role: invitation.role,
      status: invitationStatus(invitation),
      maxUses: invitation.maxUses,
      useCount: invitation.useCount,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      createdBy: invitation.createdBy,
      email: invitation.email,
      person: invitation.person,
    };
  }

  /** Person phải thuộc gia phả và chưa gắn với tài khoản nào khác trong gia phả. */
  private async linkablePerson(
    db: Prisma.TransactionClient,
    treeId: string,
    personId: string,
  ) {
    const [inTree, linked] = await Promise.all([
      db.familyTreePerson.findUnique({
        where: { treeId_personId: { treeId, personId } },
      }),
      db.membership.findUnique({
        where: { treeId_personId: { treeId, personId } },
      }),
    ]);
    return { inTree: Boolean(inTree), linked: Boolean(linked) };
  }

  async members(
    treeId: string,
    userId: string,
  ): Promise<TreeMemberListResponse> {
    await this.assertAdmin(treeId, userId);
    const memberships = await this.prisma.membership.findMany({
      where: { treeId },
      include: {
        user: true,
        person: { select: { id: true, fullName: true } },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
    return {
      members: memberships.map(({ user, role, joinedAt, person }) => ({
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role,
        joinedAt: joinedAt.toISOString(),
        person,
      })),
    };
  }

  /** Admin xóa người khác, hoặc thành viên tự rời gia phả. Không xóa được Admin. */
  async removeMember(treeId: string, targetUserId: string, userId: string) {
    if (targetUserId !== userId) await this.assertAdmin(treeId, userId);
    const target = await this.prisma.membership.findUnique({
      where: { treeId_userId: { treeId, userId: targetUserId } },
    });
    if (!target)
      throw new NotFoundException({
        code: "MEMBER_NOT_FOUND",
        message: "Người này không có quyền truy cập gia phả",
      });
    if (target.role === "ADMIN")
      throw new BadRequestException({
        code: "CANNOT_REMOVE_ADMIN",
        message: "Không thể xóa trưởng họ khỏi gia phả",
      });
    await this.prisma.membership.delete({
      where: { treeId_userId: { treeId, userId: targetUserId } },
    });
    return { success: true };
  }

  /**
   * Không có email: link chung, trả token để trưởng họ tự gửi.
   * Có email: lời mời đích danh, dùng một lần, gửi link qua email và không trả token.
   */
  async createInvitation(
    treeId: string,
    userId: string,
    body: CreateInvitationDto,
  ): Promise<CreatedTreeInvitation> {
    await this.assertAdmin(treeId, userId);
    const email = body.email?.trim().toLowerCase() || null;
    const personId = body.personId || null;
    if (personId && !email)
      throw new BadRequestException({
        code: "PERSON_REQUIRES_EMAIL",
        message: "Muốn gắn với hồ sơ thì phải mời qua email",
      });
    if (personId) {
      const person = await this.linkablePerson(this.prisma, treeId, personId);
      if (!person.inTree)
        throw new NotFoundException({
          code: "PERSON_NOT_FOUND",
          message: "Không tìm thấy thành viên trong gia phả",
        });
      if (person.linked)
        throw new ConflictException({
          code: "PERSON_ALREADY_LINKED",
          message: "Hồ sơ này đã gắn với một tài khoản khác",
        });
    }
    // Người đã vào gia phả (vd. qua link chung) vẫn mời lại được để gắn hồ sơ,
    // khi chấp nhận thì giữ nguyên vai trò, chỉ gắn Person.
    const member = email
      ? await this.prisma.membership.findFirst({
          where: { treeId, user: { email } },
        })
      : null;
    if (member && !personId)
      throw new ConflictException({
        code: "ALREADY_MEMBER",
        message: "Người này đã có quyền truy cập gia phả",
      });
    if (member?.personId)
      throw new ConflictException({
        code: "MEMBER_ALREADY_LINKED",
        message: "Tài khoản này đã gắn với một hồ sơ khác trong gia phả",
      });

    const token = generateInvitationToken();
    const invitation = await this.prisma.invitation.create({
      data: {
        treeId,
        tokenHash: hashInvitationToken(token),
        // Chưa có luồng duyệt (LMS-011) nên mọi lời mời đều chỉ cấp quyền xem.
        // Riêng link chung thì luôn chỉ xem: lộ link cũng không ai sửa được gia phả.
        role: "VIEWER",
        maxUses: email ? 1 : (body.maxUses ?? null),
        email,
        personId,
        expiresAt: new Date(
          Date.now() + (body.expiresInDays ?? DEFAULT_EXPIRES_IN_DAYS) * DAY_MS,
        ),
        createdById: userId,
      },
      include: { ...invitationInclude, tree: { select: { name: true } } },
    });
    if (!email) return { ...this.invitationView(invitation), token };

    try {
      await this.mail.sendTreeInvitation({
        email,
        inviterName: invitation.createdBy.name,
        treeName: invitation.tree.name,
        personName: invitation.person?.fullName ?? null,
        url: `${webOrigin()}/invite/${token}`,
        expiresAt: invitation.expiresAt,
      });
    } catch {
      await this.prisma.invitation.delete({ where: { id: invitation.id } });
      throw new ServiceUnavailableException({
        code: "INVITATION_EMAIL_FAILED",
        message: "Không gửi được email mời. Vui lòng thử lại sau",
      });
    }
    // Mời lại cùng một email thì chỉ link mới nhất còn dùng được.
    await this.prisma.invitation.updateMany({
      where: { treeId, email, id: { not: invitation.id }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ...this.invitationView(invitation), token: null };
  }

  async invitations(
    treeId: string,
    userId: string,
  ): Promise<TreeInvitationListResponse> {
    await this.assertAdmin(treeId, userId);
    const invitations = await this.prisma.invitation.findMany({
      where: { treeId },
      include: invitationInclude,
      orderBy: { createdAt: "desc" },
    });
    return {
      invitations: invitations.map((invitation) =>
        this.invitationView(invitation),
      ),
    };
  }

  async revokeInvitation(treeId: string, invitationId: string, userId: string) {
    await this.assertAdmin(treeId, userId);
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, treeId },
    });
    if (!invitation)
      throw new NotFoundException({
        code: "INVITATION_NOT_FOUND",
        message: "Không tìm thấy lời mời",
      });
    if (!invitation.revokedAt)
      await this.prisma.invitation.update({
        where: { id: invitationId },
        data: { revokedAt: new Date() },
      });
    return { success: true };
  }

  private async invitationByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
      include: {
        tree: { include: { _count: { select: { persons: true } } } },
        createdBy: { select: { name: true } },
        person: { select: { fullName: true } },
      },
    });
    if (!invitation)
      throw new NotFoundException({
        code: "INVITATION_NOT_FOUND",
        message: "Link mời không hợp lệ",
      });
    return invitation;
  }

  /** Công khai: chỉ trả thông tin đủ để người nhận quyết định có tham gia không. */
  async preview(token: string): Promise<InvitationPreview> {
    const invitation = await this.invitationByToken(token);
    return {
      tree: {
        name: invitation.tree.name,
        coverUrl: invitation.tree.coverUrl,
        originPlace: invitation.tree.originPlace,
        personCount: invitation.tree._count.persons,
      },
      role: invitation.role,
      invitedBy: invitation.createdBy,
      status: invitationStatus(invitation),
      expiresAt: invitation.expiresAt.toISOString(),
      emailHint: invitation.email ? maskEmail(invitation.email) : null,
      person: invitation.person,
    };
  }

  async accept(
    token: string,
    userId: string,
  ): Promise<AcceptInvitationResponse> {
    const invitation = await this.invitationByToken(token);
    const { treeId, personId } = invitation;
    const [existing, user] = await Promise.all([
      this.prisma.membership.findUnique({
        where: { treeId_userId: { treeId, userId } },
      }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    const emailMatches =
      !invitation.email ||
      (user?.email === invitation.email && Boolean(user.emailVerifiedAt));
    const status = invitationStatus(invitation);

    if (existing) {
      // Đã ở trong gia phả thì giữ nguyên vai trò cũ, không để link Viewer hạ quyền Editor.
      // Lời mời đích danh còn hạn thì vẫn gắn Person nếu tài khoản chưa gắn.
      if (
        invitation.email &&
        emailMatches &&
        status === "ACTIVE" &&
        personId &&
        !existing.personId
      )
        await this.prisma.$transaction(async (tx) => {
          await this.claim(tx, invitation.id);
          await this.linkPersonIfFree(tx, treeId, userId, personId);
        });
      return { treeId, role: existing.role, alreadyMember: true };
    }

    if (!emailMatches)
      throw new ForbiddenException({
        code: "INVITATION_EMAIL_MISMATCH",
        message: `Lời mời này dành cho ${maskEmail(invitation.email!)}. Hãy đăng nhập bằng đúng email đó`,
      });
    if (status !== "ACTIVE")
      throw new GoneException({
        code: `INVITATION_${status}`,
        message: unusableInvitation[status],
      });

    return this.prisma.$transaction(async (tx) => {
      await this.claim(tx, invitation.id);
      const membership = await tx.membership.upsert({
        where: { treeId_userId: { treeId, userId } },
        update: {},
        create: { treeId, userId, role: invitation.role },
      });
      if (personId) await this.linkPersonIfFree(tx, treeId, userId, personId);
      return { treeId, role: membership.role, alreadyMember: false };
    });
  }

  /** Tăng lượt dùng. Điều kiện nằm trong câu UPDATE để hai người bấm cùng lúc không vượt maxUses. */
  private async claim(tx: Prisma.TransactionClient, invitationId: string) {
    const claimed = await tx.invitation.updateMany({
      where: {
        id: invitationId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        OR: [
          { maxUses: null },
          { useCount: { lt: tx.invitation.fields.maxUses } },
        ],
      },
      data: { useCount: { increment: 1 } },
    });
    if (!claimed.count)
      throw new GoneException({
        code: "INVITATION_EXHAUSTED",
        message: unusableInvitation.EXHAUSTED,
      });
  }

  /** Person đã rời gia phả hoặc đã gắn tài khoản khác thì bỏ qua, người nhận vẫn vào được gia phả. */
  private async linkPersonIfFree(
    tx: Prisma.TransactionClient,
    treeId: string,
    userId: string,
    personId: string,
  ) {
    const person = await this.linkablePerson(tx, treeId, personId);
    if (!person.inTree || person.linked) return;
    await tx.membership.update({
      where: { treeId_userId: { treeId, userId } },
      data: { personId },
    });
  }
}
