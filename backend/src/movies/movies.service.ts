import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic(token?: string) {
    const host = (process.env.APP_URL || 'https://iptv.oussamma.tn').replace(/\/$/, '');
    const movies = await this.prisma.movie.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return movies.map((m, idx) => {
      // Si l'URL est relative ou proxifiée, on ajoute le token
      let playbackUrl = m.streamUrl;
      if (!playbackUrl.startsWith('http')) {
        playbackUrl = `${host}/api/v1/movies/stream/${m.id}?token=${token || 'public'}`;
      } else if (token) {
        playbackUrl += (playbackUrl.includes('?') ? '&' : '?') + `token=${token}`;
      }

      return {
        id: m.id,
        num: idx + 1,
        title: m.title,
        name: m.title,
        streamUrl: playbackUrl,
        url: playbackUrl,
        directUrl: playbackUrl,
        posterUrl: m.posterUrl || '',
        logo: m.posterUrl || '',
        backdropUrl: m.backdropUrl || '',
        container: m.container || 'mp4',
        year: m.year || new Date().getFullYear(),
        rating: m.rating || 7.5,
        genre: m.genre || 'Action',
        category: m.genre || 'Action',
        durationMin: m.durationMin || 110,
        plot: m.plot || '',
        director: m.director || '',
      };
    });
  }

  async findAllAdmin() {
    return this.prisma.movie.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException('Film introuvable');
    return movie;
  }

  async create(data: {
    title: string;
    streamUrl: string;
    posterUrl?: string;
    backdropUrl?: string;
    container?: string;
    year?: number;
    rating?: number;
    genre?: string;
    durationMin?: number;
    plot?: string;
    director?: string;
  }) {
    const slugBase = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    return this.prisma.movie.create({
      data: {
        title: data.title,
        slug,
        streamUrl: data.streamUrl,
        posterUrl: data.posterUrl,
        backdropUrl: data.backdropUrl,
        container: data.container || 'mp4',
        year: data.year ? Number(data.year) : undefined,
        rating: data.rating ? Number(data.rating) : undefined,
        genre: data.genre || 'Action',
        durationMin: data.durationMin ? Number(data.durationMin) : undefined,
        plot: data.plot,
        director: data.director,
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.movie.update({
      where: { id },
      data: {
        ...data,
        year: data.year ? Number(data.year) : undefined,
        rating: data.rating ? Number(data.rating) : undefined,
        durationMin: data.durationMin ? Number(data.durationMin) : undefined,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.movie.delete({ where: { id } });
  }

  async deleteMany(ids: string[]) {
    const res = await this.prisma.movie.deleteMany({
      where: { id: { in: ids } },
    });
    return { success: true, deletedCount: res.count };
  }
}
