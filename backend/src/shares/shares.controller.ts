import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { SharesService } from './shares.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

@ApiTags('Shares & Playlists')
@Controller('api/v1')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get('admin/shares')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lister les accès de distribution' })
  findAll() {
    return this.sharesService.findAll();
  }

  @Post('admin/shares')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer un nouvel accès de partage avec jeton' })
  create(@Body() body: any) {
    return this.sharesService.create(body);
  }

  @Post('admin/shares/:id/revoke')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Révoquer immédiatement un accès' })
  revoke(@Param('id') id: string) {
    return this.sharesService.revoke(id);
  }

  @Delete('admin/shares/:id')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer un accès de partage' })
  delete(@Param('id') id: string) {
    return this.sharesService.delete(id);
  }

  @Get('playlists/:accessId.m3u')
  @ApiOperation({ summary: 'Télécharger la playlist M3U dynamique sécurisée' })
  @ApiProduces('audio/x-mpegurl')
  async getPlaylist(
    @Param('accessId') accessId: string,
    @Res() res: Response,
  ) {
    const m3u = await this.sharesService.generateM3U(accessId);
    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="playlist-${accessId}.m3u"`);
    return res.send(m3u);
  }

  @Get('playlists/:accessId/channels')
  @ApiOperation({ summary: 'Récupérer les chaînes d\'un accès en JSON pour TV Player' })
  async getChannelsJson(@Param('accessId') accessId: string) {
    const share = await this.sharesService.validateAccess(accessId);
    return {
      shareName: share.name,
      token: share.token,
      channels: share.allowedChannels.map((ac) => ({
        id: ac.channel.id,
        name: ac.channel.name,
        logo: ac.channel.logoUrl,
        category: ac.channel.category?.name,
        streamUrl: `${process.env.APP_URL || 'https://iptv.oussamma.tn'}/api/v1/stream/${ac.channel.id}/live.m3u8?token=${share.token}`,
      })),
    };
  }
}
