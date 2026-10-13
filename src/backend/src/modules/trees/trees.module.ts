import { Module } from "@nestjs/common";
import { TreesController } from "./trees.controller.js";
import { TreesService } from "./trees.service.js";

@Module({ controllers: [TreesController], providers: [TreesService] })
export class TreesModule {}
