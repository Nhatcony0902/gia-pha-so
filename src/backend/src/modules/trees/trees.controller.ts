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
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { TreesService } from "./trees.service.js";
import { AddPersonImageDto, UpdatePersonDto } from "./trees.dto.js";

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

  @Get(":treeId/persons")
  persons(
    @Param("treeId") treeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trees.persons(treeId, request.user.userId);
  }

  @Get(":treeId/persons/:personId")
  person(
    @Param("treeId") treeId: string,
    @Param("personId") personId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trees.person(treeId, personId, request.user.userId);
  }

  @Patch(":treeId/persons/:personId")
  updatePerson(
    @Param("treeId") treeId: string,
    @Param("personId") personId: string,
    @Body() body: UpdatePersonDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trees.updatePerson(treeId, personId, request.user.userId, body);
  }

  @Delete(":treeId/persons/:personId")
  deletePerson(
    @Param("treeId") treeId: string,
    @Param("personId") personId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trees.deletePerson(treeId, personId, request.user.userId);
  }

  @Post(":treeId/persons/:personId/images")
  addImage(
    @Param("treeId") treeId: string,
    @Param("personId") personId: string,
    @Body() body: AddPersonImageDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trees.addPersonImage(
      treeId,
      personId,
      request.user.userId,
      body,
    );
  }

  @Delete(":treeId/persons/:personId/images/:imageId")
  deleteImage(
    @Param("treeId") treeId: string,
    @Param("personId") personId: string,
    @Param("imageId") imageId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trees.deletePersonImage(
      treeId,
      personId,
      imageId,
      request.user.userId,
    );
  }

  @Post(":treeId/persons/:personId/uploads/signature")
  uploadSignature(
    @Param("treeId") treeId: string,
    @Param("personId") personId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trees.cloudinarySignature(
      treeId,
      personId,
      request.user.userId,
    );
  }
}
