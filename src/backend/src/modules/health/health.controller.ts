import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@family-tree/shared-types';
import { PrismaService } from '../database/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    let status: HealthResponse['status'] = 'ok';

    try {
      await this.prisma.user.count();
    } catch {
      status = 'degraded';
    }

    return {
      status,
      service: 'family-tree-api',
      timestamp: new Date().toISOString(),
    };
  }
}