import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Invitation, User } from "@prisma/client";
import type {
  AcceptInvitationResponse,
  CreatedTreeInvitation,
  InvitationPreview,
  TreeInvitation,
  TreeInvitationListResponse,
  TreeMemberListResponse,
} from "@family-tree/shared-types";
import { PrismaService } from "../database/prisma.service.js";
import type { CreateInvitationDto } from "./memberships.dto.js";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationStatus,
} from "./invitation-token.js";

const DEFAULT_EXPIRES_IN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const unusableInvitation = {
  EXPIRED: "Lời mời đã hết hạn. Hãy nhờ trưởng họ gửi link mới",
  REVOKED: "Lời mời đã bị thu hồi",
  EXHAUSTED: "Lời mời đã hết lượt sử dụng",
} as const;

@Injectable()
export class MembershipsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
    invitation: Invitation & { createdBy: Pick<User, "id" | "name"> },
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
    };
  }

  async members(
    treeId: string,
    userId: string,
  ): Promise<TreeMemberListResponse> {
    await this.assertAdmin(treeId, userId);
    const memberships = await this.prisma.membership.findMany({
      where: { treeId },
      include: { user: true },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
    return {
      members: memberships.map(({ user, role, joinedAt }) => ({
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role,
        joinedAt: joinedAt.toISOString(),
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

  async createInvitation(
    treeId: string,
    userId: string,
    body: CreateInvitationDto,
  ): Promise<CreatedTreeInvitation> {
    await this.assertAdmin(treeId, userId);
    const token = generateInvitationToken();
    const invitation = await this.prisma.invitation.create({
      data: {
        treeId,
        tokenHash: hashInvitationToken(token),
        // Link chung chỉ cấp quyền xem: lộ link cũng không ai sửa được gia phả.
        role: "VIEWER",
        maxUses: body.maxUses ?? null,
        expiresAt: new Date(
          Date.now() + (body.expiresInDays ?? DEFAULT_EXPIRES_IN_DAYS) * DAY_MS,
        ),
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return { ...this.invitationView(invitation), token };
  }

  async invitations(
    treeId: string,
    userId: string,
  ): Promise<TreeInvitationListResponse> {
    await this.assertAdmin(treeId, userId);
    const invitations = await this.prisma.invitation.findMany({
      where: { treeId },
      include: { createdBy: { select: { id: true, name: true } } },
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
    };
  }

  async accept(
    token: string,
    userId: string,
  ): Promise<AcceptInvitationResponse> {
    const invitation = await this.invitationByToken(token);
    const { treeId } = invitation;
    const existing = await this.prisma.membership.findUnique({
      where: { treeId_userId: { treeId, userId } },
    });
    // Đã ở trong gia phả thì giữ nguyên vai trò cũ, không để link Viewer hạ quyền Editor.
    if (existing) return { treeId, role: existing.role, alreadyMember: true };

    const status = invitationStatus(invitation);
    if (status !== "ACTIVE")
      throw new GoneException({
        code: `INVITATION_${status}`,
        message: unusableInvitation[status],
      });

    return this.prisma.$transaction(async (tx) => {
      // Điều kiện nằm trong câu UPDATE để hai người bấm cùng lúc không vượt maxUses.
      const claimed = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
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
      const membership = await tx.membership.upsert({
        where: { treeId_userId: { treeId, userId } },
        update: {},
        create: { treeId, userId, role: invitation.role },
      });
      return { treeId, role: membership.role, alreadyMember: false };
    });
  }
}
