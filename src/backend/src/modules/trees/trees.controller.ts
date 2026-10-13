import { Controller, Get, Inject, Param, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { TreesService } from "./trees.service.js";

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller("trees")
@UseGuards(JwtAuthGuard)
export class TreesController {
  constructor(@Inject(TreesService) private readonly trees: TreesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.trees.list(request.user.userId);
  }

  @Get(":treeId/graph")
  graph(@Param("treeId") treeId: string, @Req() request: AuthenticatedRequest) {
    return this.trees.graph(treeId, request.user.userId);
  }

  @Get(":treeId/persons/:personId")
  person(
    @Param("treeId") treeId: string,
    @Param("personId") personId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trees.person(treeId, personId, request.user.userId);
  }
}
