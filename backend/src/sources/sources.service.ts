import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SecurityService } from '../common/security.service';
import axios from 'axios';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: SecurityService,
  ) {}

  async findAll(query?: { page?: number; limit?: number; search?: string }) {
    if (!query?.page && !query?.limit && !query?.search) {
      return this.prisma.source.findMany({
        include: { channel: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      });
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 50);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { url: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.source.count({ where }),
      this.prisma.source.findMany({
        where,
        include: { channel: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.prisma.source.findUnique({
      where: { id },
      include: { channel: true },
    });
  }

  async create(data: {
    name: string;
    url: string;
    type?: any;
    priority?: number;
    channelId?: string;
  }) {
    const safeUrl = this.security.validateStreamUrl(data.url);
    return this.prisma.source.create({
      data: {
        name: data.name,
        url: safeUrl,
        type: data.type || 'HLS',
        priority: data.priority || 1,
        channelId: data.channelId || null,
      },
    });
  }

  async update(id: string, data: any) {
    if (data.url) {
      data.url = this.security.validateStreamUrl(data.url);
    }
    return this.prisma.source.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const source = await this.prisma.source.findUnique({
      where: { id },
      select: { channelId: true },
    });

    await this.prisma.source.delete({ where: { id } });

    if (source?.channelId) {
      const remaining = await this.prisma.source.count({
        where: { channelId: source.channelId },
      });
      if (remaining === 0) {
        await this.prisma.channel.delete({
          where: { id: source.channelId },
        }).catch(() => {});
      }
    }

    return { success: true };
  }

  async deleteMany(ids: string[]) {
    if (!ids || ids.length === 0) return { deletedCount: 0 };

    const sources = await this.prisma.source.findMany({
      where: { id: { in: ids } },
      select: { id: true, channelId: true },
    });

    const channelIds = Array.from(
      new Set(sources.map((s) => s.channelId).filter((cid): cid is string => Boolean(cid)))
    );

    const res = await this.prisma.source.deleteMany({
      where: { id: { in: ids } },
    });

    // Nettoyer les chaînes orphelines sans aucune source restante
    for (const channelId of channelIds) {
      const remaining = await this.prisma.source.count({
        where: { channelId },
      });
      if (remaining === 0) {
        await this.prisma.channel.delete({
          where: { id: channelId },
        }).catch(() => {});
      }
    }

    return { deletedCount: res.count };
  }

  async deleteAll() {
    const res = await this.prisma.source.deleteMany({});
    return { deletedCount: res.count };
  }

  async checkAvailability(id: string) {
    const source = await this.findOne(id);
    if (!source) throw new Error('Source introuvable');

    const startTime = Date.now();
    try {
      this.security.validateStreamUrl(source.url);

      const res = await axios.get(source.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-Server/1.0',
        },
        maxContentLength: 512 * 1024,
      });

      const responseTime = Date.now() - startTime;
      const isOk = res.status >= 200 && res.status < 400;

      await this.prisma.source.update({
        where: { id },
        data: {
          status: isOk ? 'ONLINE' : 'ERROR',
          lastCheckedAt: new Date(),
          lastErrorMessage: isOk ? null : `HTTP status ${res.status}`,
        },
      });

      return {
        online: isOk,
        status: res.status,
        responseTimeMs: responseTime,
      };
    } catch (err: any) {
      await this.prisma.source.update({
        where: { id },
        data: {
          status: 'OFFLINE',
          lastCheckedAt: new Date(),
          lastErrorMessage: err.message,
        },
      });

      return {
        online: false,
        status: 'OFFLINE',
        error: err.message,
      };
    }
  }

  async parseM3UPreview(input: { content?: string; url?: string } | string) {
    let m3uContent = '';

    if (typeof input === 'string') {
      m3uContent = input;
    } else if (input && typeof input === 'object') {
      if (input.url && input.url.trim()) {
        const safeUrl = this.security.validateStreamUrl(input.url.trim());
        try {
          const res = await axios.get(safeUrl, {
            timeout: 25000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-Server/1.0',
            },
            maxContentLength: 50 * 1024 * 1024,
            responseType: 'text',
          });
          m3uContent = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        } catch (fetchErr: any) {
          throw new Error(`Impossible de télécharger la playlist M3U depuis l'URL : ${fetchErr.message}`);
        }
      } else {
        m3uContent = input.content || '';
      }
    }

    if (!m3uContent || !m3uContent.trim()) {
      return [];
    }

    const lines = m3uContent.split(/\r?\n/);
    const items: any[] = [];
    let currentItem: any = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        currentItem = {
          name: 'Chaîne sans nom',
          url: '',
          tvgId: null,
          tvgName: null,
          tvgLogo: null,
          group: 'Général',
        };

        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
        if (tvgIdMatch) currentItem.tvgId = tvgIdMatch[1];

        const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
        if (tvgNameMatch) currentItem.tvgName = tvgNameMatch[1];

        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i);
        if (tvgLogoMatch) currentItem.tvgLogo = tvgLogoMatch[1];

        const groupMatch = line.match(/group-title="([^"]*)"/i);
        if (groupMatch) currentItem.group = groupMatch[1];

        const commaIndex = line.lastIndexOf(',');
        if (commaIndex !== -1) {
          currentItem.name = line.substring(commaIndex + 1).trim() || currentItem.name;
        }
      } else if (!line.startsWith('#') && currentItem) {
        currentItem.url = line;
        items.push({ ...currentItem, index: items.length });
        currentItem = null;
      }
    }

    return items;
  }

  async importM3UItems(selectedItems: Array<{
    name: string;
    url: string;
    group?: string;
    tvgLogo?: string;
    tvgId?: string;
  }>) {
    const results = [];
    const categoryCache = new Map<string, string>(); // slugCat -> category.id

    for (const item of selectedItems) {
      try {
        const safeUrl = this.security.validateStreamUrl(item.url);

        // 1. Get or create category with cache
        const catName = item.group || 'Général';
        const slugCat = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        let categoryId = categoryCache.get(slugCat);
        if (!categoryId) {
          const category = await this.prisma.category.upsert({
            where: { slug: slugCat },
            update: {},
            create: { name: catName, slug: slugCat },
          });
          categoryId = category.id;
          categoryCache.set(slugCat, categoryId);
        }

        // 2. Channel slug
        const chanSlug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const channel = await this.prisma.channel.upsert({
          where: { slug: chanSlug },
          update: {
            logoUrl: item.tvgLogo || undefined,
            epgChannelId: item.tvgId || undefined,
          },
          create: {
            name: item.name,
            slug: chanSlug,
            logoUrl: item.tvgLogo,
            epgChannelId: item.tvgId,
            categoryId: categoryId,
          },
        });

        // 3. Create or attach source
        const source = await this.prisma.source.create({
          data: {
            name: `${item.name} (Source Principale)`,
            url: safeUrl,
            type: 'HLS',
            channelId: channel.id,
            priority: 1,
            status: 'UNKNOWN',
          },
        });

        results.push({ success: true, channelId: channel.id, sourceId: source.id });
      } catch (err: any) {
        results.push({ success: false, name: item.name, error: err.message });
      }
    }

    return { importedCount: results.filter(r => r.success).length, details: results };
  }
}
