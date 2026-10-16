import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  getPrisma() {
    return this.prisma;
  }

  async findAllPublic(token?: string) {
    const host = (process.env.APP_URL || 'https://iptv.oussamma.tn').replace(/\/$/, '');

    let targetToken = token;
    let allowedChannelIds: string[] | null = null;

    if (targetToken) {
      try {
        const share = await this.prisma.shareAccess.findFirst({
          where: {
            OR: [{ token: targetToken }, { id: targetToken }],
            isActive: true,
          },
          include: { allowedChannels: true },
        });
        if (share) {
          targetToken = share.token;
          allowedChannelIds = share.allowedChannels.map((ac) => ac.channelId);
        }
      } catch {}
    }

    if (!targetToken) {
      const defaultShare = await this.prisma.shareAccess.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      targetToken = defaultShare ? defaultShare.token : 'public_stream';
    }

    const whereClause: any = { isActive: true };
    if (allowedChannelIds && allowedChannelIds.length > 0) {
      whereClause.id = { in: allowedChannelIds };
    }

    const channels = await this.prisma.channel.findMany({
      where: whereClause,
      include: {
        category: true,
        sources: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return channels.map((ch, index) => {
      const streamUrl = `${host}/api/v1/stream/${ch.id}/live.m3u8?token=${targetToken}`;
      return {
        id: ch.id,
        name: ch.name,
        slug: ch.slug,
        num: index + 1,
        streamUrl,
        url: streamUrl,
        directUrl: streamUrl,
        logo: ch.logoUrl || '',
        logoUrl: ch.logoUrl || '',
        icon: ch.logoUrl || '',
        category: ch.category?.name || 'Général',
        categoryName: ch.category?.name || 'Général',
        categoryId: ch.categoryId,
        group: ch.category?.name || 'Général',
        country: ch.country || 'TN',
        language: ch.language || 'ara',
        epgId: ch.epgChannelId || ch.slug,
        epgChannelId: ch.epgChannelId || ch.slug,
        sources: ch.sources.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
        })),
      };
    });
  }

  async findAllAdmin() {
    return this.prisma.channel.findMany({
      include: {
        category: true,
        sources: {
          orderBy: { priority: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        category: true,
        sources: {
          orderBy: { priority: 'asc' },
        },
      },
    });
    if (!channel) throw new NotFoundException('Chaîne introuvable');
    return channel;
  }

  async create(data: {
    name: string;
    slug?: string;
    logoUrl?: string;
    country?: string;
    language?: string;
    categoryId?: string;
    description?: string;
    epgChannelId?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return this.prisma.channel.create({
      data: {
        name: data.name,
        slug,
        logoUrl: data.logoUrl,
        country: data.country || 'TN',
        language: data.language || 'ara',
        categoryId: data.categoryId || null,
        description: data.description,
        epgChannelId: data.epgChannelId,
        isActive: data.isActive !== undefined ? data.isActive : true,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.channel.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.channel.delete({ where: { id } });
  }

  async deleteMany(ids: string[]) {
    if (!ids || ids.length === 0) return { deletedCount: 0 };
    const res = await this.prisma.channel.deleteMany({
      where: { id: { in: ids } },
    });
    return { deletedCount: res.count };
  }

  async cleanupOrphans() {
    const res = await this.prisma.channel.deleteMany({
      where: { sources: { none: {} } },
    });
    return { cleanedCount: res.count };
  }

  async getCategories() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { channels: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return this.prisma.category.create({
      data: { name, slug },
    });
  }
}
