import { Module } from "@nestjs/common";
import {
  InvitationsController,
  TreeMembershipsController,
} from "./memberships.controller.js";
import { MembershipsService } from "./memberships.service.js";

@Module({
  controllers: [TreeMembershipsController, InvitationsController],
  providers: [MembershipsService],
})
export class MembershipsModule {}
