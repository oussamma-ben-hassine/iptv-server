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
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

@ApiTags('Movies / VOD')
@Controller('api/v1')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('movies')
  @ApiOperation({ summary: 'Lister les films actifs (Public / Lecteurs IPTV)' })
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
    return this.moviesService.findAllPublic(activeToken);
  }

  @Get('movies/:id')
  @ApiOperation({ summary: 'Obtenir un film par ID' })
  findOne(@Param('id') id: string) {
    return this.moviesService.findOne(id);
  }

  // --- Endpoints Administrateur ---
  @Get('admin/movies')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lister tous les films du catalogue (Admin)' })
  findAllAdmin() {
    return this.moviesService.findAllAdmin();
  }

  @Post('admin/movies')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ajouter un film au catalogue' })
  create(@Body() body: any) {
    return this.moviesService.create(body);
  }

  @Put('admin/movies/:id')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier un film' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.moviesService.update(id, body);
  }

  @Delete('admin/movies/:id')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer un film' })
  delete(@Param('id') id: string) {
    return this.moviesService.delete(id);
  }

  @Post('admin/movies/bulk-delete')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer plusieurs films en une seule action' })
  bulkDelete(@Body('ids') ids: string[]) {
    return this.moviesService.deleteMany(ids);
  }

  @Get('movies/stream/:fileName')
  @ApiOperation({ summary: 'Passerelle streaming fichier VOD avec support Range' })
  async streamMovie(
    @Param('fileName') fileName: string,
    @Headers('range') range: string,
    @Res() res: any,
  ) {
    return this.moviesService.streamLocalFile(fileName, range, res);
  }

  @Post('admin/movies/upload')
  @UseGuards(AuthGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const fs = require('fs');
          const dir = '/data/vod';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const path = require('path');
          const ext = path.extname(file.originalname).toLowerCase();
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024, // 10 GB
      },
    }),
  )
  @ApiOperation({ summary: 'Uploader un fichier vidéo VOD local (.mp4, .mkv, etc.)' })
  uploadVideoFile(@UploadedFile() file: any) {
    if (!file) {
      return { error: 'Aucun fichier reçu' };
    }
    const path = require('path');
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    const streamUrl = `/api/v1/movies/stream/${file.filename}`;
    return {
      success: true,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      container: ext || 'mp4',
      streamUrl,
    };
  }
}
