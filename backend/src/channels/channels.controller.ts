import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
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
  findAllPublic() {
    return this.channelsService.findAllPublic();
  }

  @Get('channels/:id')
  @ApiOperation({ summary: 'Obtenir une chaîne par ID' })
  findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
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
  @ApiOperation({ summary: 'Lister toutes les chaînes (Admin)' })
  findAllAdmin() {
    return this.channelsService.findAllAdmin();
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

  @Post('admin/categories')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer une catégorie' })
  createCategory(@Body('name') name: string) {
    return this.channelsService.createCategory(name);
  }
}
