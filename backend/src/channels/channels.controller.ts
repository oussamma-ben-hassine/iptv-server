import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

@ApiTags('Channels')
@Controller('api/v1')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get('channels')
  @ApiOperation({ summary: 'Lister les chaînes actives (Public / Lecteurs)' })
  findAllPublic(
    @Query('token') token?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    let activeToken = token;
    if (!activeToken && authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        activeToken = parts[1];
      } else {
        activeToken = authHeader;
      }
    }
    return this.channelsService.findAllPublic(activeToken);
  }

  @Get('channels/:id')
  @ApiOperation({ summary: 'Obtenir une chaîne par ID' })
  findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Get('player_api.php')
  @ApiOperation({ summary: 'Compatibilité Xtream Codes API pour lecteurs IPTV' })
  async playerApi(
    @Query('username') username?: string,
    @Query('password') password?: string,
    @Query('action') action?: string,
    @Query('token') queryToken?: string,
  ) {
    const token = username || password || queryToken;
    const channels = await this.channelsService.findAllPublic(token);

    if (action === 'get_live_categories') {
      const cats = await this.channelsService.getCategories();
      return cats.map((c, idx) => ({
        category_id: c.id,
        category_name: c.name,
        parent_id: 0,
      }));
    }

    if (action === 'get_live_streams') {
      return channels.map((ch, idx) => ({
        num: idx + 1,
        name: ch.name,
        stream_type: 'live',
        stream_id: ch.id,
        stream_icon: ch.logo,
        epg_channel_id: ch.epgId,
        added: '1700000000',
        category_id: ch.categoryId || '1',
        custom_sid: '',
        tv_archive: 0,
        direct_source: ch.streamUrl,
      }));
    }

    if (action === 'get_vod_categories') {
      return [
        { category_id: '1', category_name: 'Action', parent_id: 0 },
        { category_id: '2', category_name: 'Comédie', parent_id: 0 },
        { category_id: '3', category_name: 'Drame', parent_id: 0 },
        { category_id: '4', category_name: 'Science-Fiction', parent_id: 0 },
        { category_id: '5', category_name: 'Documentaire', parent_id: 0 },
        { category_id: '6', category_name: 'Animation', parent_id: 0 },
      ];
    }

    if (action === 'get_vod_streams') {
      const movies = await this.channelsService.getPrisma().movie.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const baseUrl = (process.env.APP_URL || 'https://iptv.oussamma.tn').replace(/\/$/, '');
      return movies.map((m, idx) => {
        const directSource = m.streamUrl.startsWith('http')
          ? m.streamUrl
          : `${baseUrl}${m.streamUrl.startsWith('/') ? '' : '/'}${m.streamUrl}`;

        return {
          num: idx + 1,
          name: m.title,
          title: m.title,
          year: String(m.year || 2024),
          stream_type: 'movie',
          stream_id: m.id,
          stream_icon: m.posterUrl || '',
          rating: String(m.rating || '7.5'),
          rating_5based: 4,
          added: '1700000000',
          category_id: '1',
          container_extension: m.container || 'mp4',
          custom_sid: '',
          direct_source: directSource,
        };
      });
    }

    // Default Xtream auth response
    return {
      user_info: {
        username: token || 'guest',
        password: '******',
        message: 'Bienvenue sur IPTV Server',
        auth: 1,
        status: 'Active',
        exp_date: '1893456000',
        is_trial: '0',
        active_cons: '0',
        max_connections: '999',
        allowed_output_formats: ['m3u8', 'ts'],
      },
      server_info: {
        url: (process.env.APP_URL || 'https://iptv.oussamma.tn').replace(/\/$/, ''),
        port: '443',
        https_port: '443',
        server_protocol: 'https',
        rtmp_port: '1935',
        timezone: 'Europe/Paris',
        time_now: new Date().toISOString(),
      },
    };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lister les catégories de chaînes' })
  getCategories() {
    return this.channelsService.getCategories();
  }

  // --- Endpoints Administrateur ---
  @Get('admin/channels')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lister les chaînes (Admin avec pagination optionnelle)' })
  findAllAdmin(@Query() query?: any) {
    return this.channelsService.findAllAdmin(query);
  }

  @Post('admin/channels')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer une chaîne' })
  createChannel(@Body() body: any) {
    return this.channelsService.create(body);
  }

  @Put('admin/channels/:id')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier une chaîne' })
  updateChannel(@Param('id') id: string, @Body() body: any) {
    return this.channelsService.update(id, body);
  }

  @Delete('admin/channels/:id')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer une chaîne' })
  deleteChannel(@Param('id') id: string) {
    return this.channelsService.delete(id);
  }

  @Post('admin/channels/bulk-delete')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer plusieurs chaînes simultanément' })
  bulkDeleteChannels(@Body('ids') ids: string[]) {
    return this.channelsService.deleteMany(ids);
  }

  @Post('admin/channels/cleanup-orphans')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer automatiquement toutes les chaînes sans source' })
  cleanupOrphans() {
    return this.channelsService.cleanupOrphans();
  }

  @Post('admin/channels/delete-all')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer toutes les chaînes de télévision' })
  deleteAllChannels() {
    return this.channelsService.deleteAll();
  }

  @Post('admin/categories')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer une catégorie' })
  createCategory(@Body('name') name: string) {
    return this.channelsService.createCategory(name);
  }
}
