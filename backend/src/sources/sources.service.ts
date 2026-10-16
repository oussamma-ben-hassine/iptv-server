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

  async findAll() {
    return this.prisma.source.findMany({
      include: { channel: true },
      orderBy: { createdAt: 'desc' },
    });
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
    return this.prisma.source.delete({ where: { id } });
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

  parseM3UPreview(m3uContent: string) {
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

    for (const item of selectedItems) {
      try {
        const safeUrl = this.security.validateStreamUrl(item.url);

        // 1. Get or create category
        const catName = item.group || 'Général';
        const slugCat = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const category = await this.prisma.category.upsert({
          where: { slug: slugCat },
          update: {},
          create: { name: catName, slug: slugCat },
        });

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
            categoryId: category.id,
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
