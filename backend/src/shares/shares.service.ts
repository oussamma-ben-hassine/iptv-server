import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);
  private readonly baseUrl = (process.env.APP_URL || 'https://iptv.oussamma.tn').replace(/\/$/, '');

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shareAccess.findMany({
      include: {
        allowedChannels: {
          orderBy: { sortOrder: 'asc' },
          include: { channel: true },
        },
        user: true,
        _count: {
          select: { playbackSessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const share = await this.prisma.shareAccess.findUnique({
      where: { id },
      include: {
        allowedChannels: {
          orderBy: { sortOrder: 'asc' },
          include: { channel: true },
        },
        user: true,
      },
    });
    if (!share) throw new NotFoundException('Accès de partage introuvable');
    return share;
  }

  async create(data: {
    name: string;
    userId?: string;
    maxSessions?: number;
    expiresAt?: Date | string;
    channelIds?: string[];
  }) {
    const token = crypto.randomBytes(24).toString('hex');
    const share = await this.prisma.shareAccess.create({
      data: {
        name: data.name,
        token,
        userId: data.userId || null,
        maxSessions: data.maxSessions || 2,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    if (data.channelIds && data.channelIds.length > 0) {
      await this.prisma.shareChannel.createMany({
        data: data.channelIds.map((cid, index) => ({
          shareAccessId: share.id,
          channelId: cid,
          sortOrder: index,
        })),
        skipDuplicates: true,
      });
    } else {
      // Si aucune chaîne n'est explicitement cochée, inclure par défaut toutes les chaînes actives
      const allActiveChannels = await this.prisma.channel.findMany({
        where: { isActive: true },
        select: { id: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (allActiveChannels.length > 0) {
        await this.prisma.shareChannel.createMany({
          data: allActiveChannels.map((c, index) => ({
            shareAccessId: share.id,
            channelId: c.id,
            sortOrder: index,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(share.id);
  }

  async update(id: string, data: {
    name?: string;
    maxSessions?: number;
    expiresAt?: Date | string | null;
    channelIds?: string[];
    isActive?: boolean;
  }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.maxSessions !== undefined) updateData.maxSessions = data.maxSessions;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    await this.prisma.shareAccess.update({
      where: { id },
      data: updateData,
    });

    if (data.channelIds !== undefined) {
      await this.prisma.shareChannel.deleteMany({
        where: { shareAccessId: id },
      });
      if (data.channelIds.length > 0) {
        await this.prisma.shareChannel.createMany({
          data: data.channelIds.map((cid, index) => ({
            shareAccessId: id,
            channelId: cid,
            sortOrder: index,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(id);
  }

  async revoke(id: string) {
    return this.prisma.shareAccess.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async delete(id: string) {
    return this.prisma.shareAccess.delete({ where: { id } });
  }

  async validateAccess(tokenOrId: string) {
    const share = await this.prisma.shareAccess.findFirst({
      where: {
        OR: [{ id: tokenOrId }, { token: tokenOrId }],
      },
      include: {
        allowedChannels: {
          orderBy: { sortOrder: 'asc' },
          include: {
            channel: {
              include: {
                category: true,
                sources: {
                  where: { isActive: true },
                  orderBy: { priority: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!share) {
      throw new NotFoundException('Accès ou jeton introuvable');
    }

    if (!share.isActive) {
      throw new ForbiddenException('Cet accès de diffusion a été révoqué');
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new ForbiddenException('Cet accès de diffusion est expiré');
    }

    return share;
  }

  async generateM3U(tokenOrId: string): Promise<string> {
    const share = await this.validateAccess(tokenOrId);

    let m3u = '#EXTM3U url-tvg="' + this.baseUrl + '/api/v1/epg"\n\n';

    for (const item of share.allowedChannels) {
      const ch = item.channel;
      if (!ch.isActive) continue;

      const tvgId = ch.epgChannelId || ch.slug;
      const logo = ch.logoUrl || '';
      const group = ch.category?.name || 'Général';
      const playUrl = `${this.baseUrl}/api/v1/stream/${ch.id}/live.m3u8?token=${share.token}`;

      m3u += `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${ch.name}" tvg-logo="${logo}" group-title="${group}",${ch.name}\n`;
      m3u += `${playUrl}\n\n`;
    }

    // Ajouter la section Films / VOD
    try {
      const movies = await this.prisma.movie.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      if (movies.length > 0) {
        m3u += '\n### SECTION FILMS & VOD ###\n\n';
        for (const m of movies) {
          const group = `Films | ${m.genre || 'Cinéma'}`;
          let moviePlayUrl = m.streamUrl.startsWith('http')
            ? m.streamUrl
            : `${this.baseUrl}${m.streamUrl.startsWith('/') ? '' : '/'}${m.streamUrl}`;

          if (moviePlayUrl.includes('?') && !moviePlayUrl.includes('token=')) {
            moviePlayUrl += `&token=${share.token}`;
          } else if (!moviePlayUrl.includes('?')) {
            moviePlayUrl += `?token=${share.token}`;
          }

          m3u += `#EXTINF:-1 tvg-id="${m.slug}" tvg-name="${m.title}" tvg-logo="${m.posterUrl || ''}" group-title="${group}",${m.title} (${m.year || ''})\n`;
          m3u += `${moviePlayUrl}\n\n`;
        }
      }
    } catch {}

    return m3u;
  }
}
