import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AuthGuard, Roles } from '../auth/auth.guard';
import * as os from 'os';

@ApiTags('Health & Monitoring')
@Controller('api/v1')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Vérification de l\'état de santé de l\'application' })
  async getHealth() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      database: dbStatus,
      system: {
        memoryUsage: process.memoryUsage(),
        totalMemoryBytes: os.totalmem(),
        freeMemoryBytes: os.freemem(),
        loadAverage: os.loadavg(),
      },
    };
  }

  @Get('admin/dashboard')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Statistiques complètes du tableau de bord' })
  async getDashboard() {
    const [
      channelsCount,
      sourcesCount,
      activeSourcesCount,
      sharesCount,
      activeSessionsCount,
      categoriesCount,
    ] = await Promise.all([
      this.prisma.channel.count(),
      this.prisma.source.count(),
      this.prisma.source.count({ where: { status: 'ONLINE' } }),
      this.prisma.shareAccess.count({ where: { isActive: true } }),
      this.prisma.playbackSession.count({
        where: { lastPingAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
      }),
      this.prisma.category.count(),
    ]);

    const recentErrors = await this.prisma.source.findMany({
      where: { status: 'ERROR' },
      take: 5,
      select: { id: true, name: true, lastErrorMessage: true, lastCheckedAt: true },
    });

    return {
      channelsCount,
      sourcesCount,
      activeSourcesCount,
      sharesCount,
      activeSessionsCount,
      categoriesCount,
      recentErrors,
      services: {
        api: 'running',
        streamingGateway: 'active',
        mediamtx: 'configured',
      },
    };
  }
}
