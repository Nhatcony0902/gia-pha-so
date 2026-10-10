import { Controller, Get, Inject, Logger } from '@nestjs/common';
import type { HealthResponse } from '@family-tree/shared-types';
import { PrismaService } from '../database/prisma.service.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    let status: HealthResponse['status'] = 'ok';

    try {
      await this.prisma.user.count();
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      status = 'degraded';
    }

    return {
      status,
      service: 'family-tree-api',
      timestamp: new Date().toISOString(),
    };
  }
}