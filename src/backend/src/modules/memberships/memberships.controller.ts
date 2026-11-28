import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { MembershipsService } from "./memberships.service.js";
import { CreateInvitationDto, UpdateMemberRoleDto } from "./memberships.dto.js";

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller("trees/:treeId")
@UseGuards(JwtAuthGuard)
export class TreeMembershipsController {
  constructor(
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
  ) {}

  @Get("members")
  members(
    @Param("treeId") treeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.memberships.members(treeId, request.user.userId);
  }

  /** Admin đổi vai trò thành viên (LMS-010). */
  @Patch("members/:userId")
  updateMemberRole(
    @Param("treeId") treeId: string,
    @Param("userId") targetUserId: string,
    // Chỉ rõ kiểu DTO: chạy bằng tsx không có decorator metadata (xem chat.controller.ts).
    @Body(
      new ValidationPipe({
        expectedType: UpdateMemberRoleDto,
        whitelist: true,
        transform: true,
      }),
    )
    body: UpdateMemberRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.memberships.updateMemberRole(
      treeId,
      targetUserId,
      body.role,
      request.user.userId,
    );
  }

  @Delete("members/:userId")
  removeMember(
    @Param("treeId") treeId: string,
    @Param("userId") targetUserId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.memberships.removeMember(
      treeId,
      targetUserId,
      request.user.userId,
    );
  }

  @Get("invitations")
  invitations(
    @Param("treeId") treeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.memberships.invitations(treeId, request.user.userId);
  }

  @Post("invitations")
  createInvitation(
    @Param("treeId") treeId: string,
    @Body() body: CreateInvitationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.memberships.createInvitation(treeId, request.user.userId, body);
  }

  @Delete("invitations/:invitationId")
  revokeInvitation(
    @Param("treeId") treeId: string,
    @Param("invitationId") invitationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.memberships.revokeInvitation(
      treeId,
      invitationId,
      request.user.userId,
    );
  }
}

@Controller("invitations/:token")
export class InvitationsController {
  constructor(
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  preview(@Param("token") token: string) {
    return this.memberships.preview(token);
  }

  @Post("accept")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  accept(@Param("token") token: string, @Req() request: AuthenticatedRequest) {
    return this.memberships.accept(token, request.user.userId);
  }
}
