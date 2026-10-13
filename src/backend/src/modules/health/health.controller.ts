import { Controller, Get, Inject, Logger, Req } from "@nestjs/common";
import type { HealthResponse } from "@family-tree/shared-types";
import { PrismaService } from "../database/prisma.service.js";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  @Get()
  async getHealth(@Req() request: Request): Promise<HealthResponse> {
    let status: HealthResponse["status"] = "ok";
    let authenticated = false;

    try {
      await this.prisma.user.count();
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      status = "degraded";
    }

    const token = request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.slice(7)
      : undefined;
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ type: string }>(token);
        authenticated = payload.type === "access";
      } catch {
        authenticated = false;
      }
    }

    return {
      status,
      service: "family-tree-api",
      timestamp: new Date().toISOString(),
      authenticated,
    };
  }
}
