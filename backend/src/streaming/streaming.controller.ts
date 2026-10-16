import { Controller, Get, Param, Query, Res, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { StreamingService } from './streaming.service';

@ApiTags('Streaming Gateway')
@Controller('api/v1/stream')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get(':channelId/live.m3u8')
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

  @Get('segment/:encodedUrl')
  @ApiOperation({ summary: 'Passerelle segment vidéo authentifiée' })
  async getSegment(
    @Param('encodedUrl') encodedUrl: string,
    @Query('token') token: string,
    @Headers('range') range: string,
    @Res() res: Response,
  ) {
    return this.streamingService.proxySegment(encodedUrl, token, res, range);
  }
}
