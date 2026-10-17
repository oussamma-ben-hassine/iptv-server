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
import { SourcesService } from './sources.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

@ApiTags('Sources')
@Controller('api/v1/sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lister toutes les sources IPTV' })
  findAll() {
    return this.sourcesService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ajouter une source vidéo' })
  create(@Body() body: any) {
    return this.sourcesService.create(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier une source vidéo' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.sourcesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer une source vidéo' })
  delete(@Param('id') id: string) {
    return this.sourcesService.delete(id);
  }

  @Post('bulk-delete')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer plusieurs sources vidéo et synchroniser le catalogue' })
  bulkDelete(@Body('ids') ids: string[]) {
    return this.sourcesService.deleteMany(ids);
  }

  @Post(':id/check')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tester la disponibilité d\'une source' })
  check(@Param('id') id: string) {
    return this.sourcesService.checkAvailability(id);
  }

  @Post('m3u/preview')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Prévisualiser une playlist M3U brute ou depuis une URL avant import' })
  previewM3U(@Body() body: any) {
    return this.sourcesService.parseM3UPreview(body);
  }

  @Post('m3u/import')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Importer les chaînes sélectionnées depuis M3U' })
  importM3U(@Body('items') items: any[]) {
    return this.sourcesService.importM3UItems(items);
  }
}
