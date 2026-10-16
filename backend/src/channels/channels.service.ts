import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic() {
    return this.prisma.channel.findMany({
      where: { isActive: true },
      include: {
        category: true,
        sources: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
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
