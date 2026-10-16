import { Controller, Get, Delete, Param, Query, Res, Req, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { StreamingService } from './streaming.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

@ApiTags('Streaming Gateway')
@Controller('api/v1')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get('stream/:channelId/live.m3u8')
  @ApiOperation({ summary: 'Passerelle HLS Live sécurisée pour lecteur compatible' })
  async getLiveStream(
    @Param('channelId') channelId: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.streamingService.proxyHlsPlaylist(channelId, token, res, ip, ua);
  }

  @Get('stream/segment/:encodedUrl')
  @ApiOperation({ summary: 'Passerelle segment vidéo authentifiée' })
  async getSegment(
    @Param('encodedUrl') encodedUrl: string,
    @Query('token') token: string,
    @Headers('range') range: string,
    @Res() res: Response,
  ) {
    return this.streamingService.proxySegment(encodedUrl, token, res, range);
  }

  @Get('admin/analytics')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Statistiques et sessions actives en temps réel' })
  async getRealtimeAnalytics() {
    return this.streamingService.getRealtimeAnalytics();
  }

  @Delete('admin/sessions/:id')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Couper/terminer immédiatement une session de streaming' })
  async terminateSession(@Param('id') id: string) {
    return this.streamingService.terminateSession(id);
  }
}

