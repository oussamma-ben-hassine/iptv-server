import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SharesService } from '../shares/shares.service';
import axios from 'axios';
import { Response } from 'express';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly baseUrl = (process.env.APP_URL || 'https://iptv.oussamma.tn').replace(/\/$/, '');
  private readonly mediamtxUrl = (process.env.MEDIAMTX_API_URL || 'http://mediamtx:9997').replace(/\/$/, '');

  constructor(
    private readonly prisma: PrismaService,
    private readonly sharesService: SharesService,
  ) {}

  async validatePlaybackSession(token: string, channelId: string, ip?: string, ua?: string) {
    if (!token) {
      throw new ForbiddenException('Jeton de lecture (token) manquant');
    }

    if (token === 'admin_preview') {
      return { share: { name: 'Admin Preview', maxSessions: 0, token: 'admin_preview' }, session: null };
    }

    const share = await this.sharesService.validateAccess(token);

    // Vérifier si la chaîne fait partie de ce partage
    const isAllowed = share.allowedChannels.some((ac) => ac.channelId === channelId);
    if (!isAllowed) {
      throw new ForbiddenException('Cette chaîne n\'est pas autorisée pour votre accès');
    }

    // Gestion des sessions simultanées (si maxSessions > 0, sinon 0 = illimité)
    const twoMinutesAgo = new Date(Date.now() - 2.5 * 60 * 1000);
    const clientIp = ip || 'unknown';
    const userAgent = ua ? ua.substring(0, 255) : 'unknown';

    if (share.maxSessions > 0) {
      const activeSessions = await this.prisma.playbackSession.count({
        where: {
          shareAccessId: share.id,
          lastPingAt: { gte: twoMinutesAgo },
          // Exclure la même IP/chaîne pour ne pas doubler les requêtes HLS d'un même lecteur
          NOT: {
            clientIp,
            channelId,
          },
        },
      });

      if (activeSessions >= share.maxSessions) {
        this.logger.warn(`Limite de sessions simultanées (${share.maxSessions}) atteinte pour l'accès ${share.name}`);
        throw new ForbiddenException(`Limite de ${share.maxSessions} connexion(s) simultanée(s) atteinte pour cet accès`);
      }
    }

    // Chercher une session active existante pour ce client et cette chaîne
    const existing = await this.prisma.playbackSession.findFirst({
      where: {
        shareAccessId: share.id,
        channelId,
        clientIp,
        lastPingAt: { gte: twoMinutesAgo },
      },
    });

    let session;
    if (existing) {
      session = await this.prisma.playbackSession.update({
        where: { id: existing.id },
        data: { lastPingAt: new Date() },
      });
    } else {
      session = await this.prisma.playbackSession.create({
        data: {
          shareAccessId: share.id,
          channelId,
          clientIp,
          userAgent,
        },
      });
    }

    return { share, session };
  }

  async getRealtimeAnalytics() {
    const twoMinutesAgo = new Date(Date.now() - 2.5 * 60 * 1000);

    const activeSessions = await this.prisma.playbackSession.findMany({
      where: {
        lastPingAt: { gte: twoMinutesAgo },
      },
      include: {
        shareAccess: {
          select: { id: true, name: true, token: true, maxSessions: true },
        },
        channel: {
          select: { id: true, name: true, logoUrl: true, category: true },
        },
      },
      orderBy: { lastPingAt: 'desc' },
    });

    const totalSessionsAllTime = await this.prisma.playbackSession.count();

    // Calcul du top chaînes
    const channelCounts: Record<string, { channelId: string; name: string; logoUrl?: string; count: number }> = {};
    for (const s of activeSessions) {
      if (!channelCounts[s.channelId]) {
        channelCounts[s.channelId] = {
          channelId: s.channelId,
          name: s.channel?.name || 'Chaîne inconnue',
          logoUrl: s.channel?.logoUrl || undefined,
          count: 0,
        };
      }
      channelCounts[s.channelId].count += 1;
    }

    const topChannels = Object.values(channelCounts).sort((a, b) => b.count - a.count);

    return {
      activeCount: activeSessions.length,
      totalSessionsAllTime,
      estimatedBandwidthMbps: (activeSessions.length * 4.5).toFixed(1), // estimation ~4.5 Mbps / stream HD
      topChannels,
      activeSessions: activeSessions.map((s) => ({
        id: s.id,
        clientIp: s.clientIp,
        userAgent: s.userAgent,
        startedAt: s.startedAt,
        lastPingAt: s.lastPingAt,
        channel: s.channel || { id: s.channelId, name: 'Chaîne inconnue', logoUrl: null },
        share: s.shareAccess || { id: s.shareAccessId, name: 'Partage inconnu', maxSessions: 0 },
      })),
    };
  }

  async terminateSession(sessionId: string) {
    try {
      await this.prisma.playbackSession.delete({
        where: { id: sessionId },
      });
      return { success: true, message: 'Session terminée avec succès' };
    } catch {
      throw new NotFoundException('Session introuvable ou déjà terminée');
    }
  }

  async getPrimarySource(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        sources: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!channel || channel.sources.length === 0) {
      throw new NotFoundException('Aucune source active disponible pour cette chaîne');
    }

    return channel.sources[0];
  }

  private rewriteM3u8Content(content: string, effectiveUrl: string, token: string): string {
    const baseUrl = effectiveUrl.substring(0, effectiveUrl.lastIndexOf('/') + 1);
    const lines = content.split('\n');
    const rewritten = lines.map((line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        if (trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
            const abs = uri.startsWith('http') ? uri : new URL(uri, baseUrl).toString();
            const enc = Buffer.from(abs).toString('base64url');
            return `URI="${this.baseUrl}/api/v1/stream/segment/${enc}?token=${token}"`;
          });
        }
        return line;
      }

      // C'est une URL de segment ou sous-playlist
      const absoluteUrl = trimmed.startsWith('http')
        ? trimmed
        : new URL(trimmed, baseUrl).toString();

      const encodedSegment = Buffer.from(absoluteUrl).toString('base64url');
      return `${this.baseUrl}/api/v1/stream/segment/${encodedSegment}?token=${token}`;
    });

    return rewritten.join('\n');
  }

  async proxyHlsPlaylist(
    channelId: string,
    token: string,
    res: Response,
    ip?: string,
    ua?: string,
  ) {
    await this.validatePlaybackSession(token, channelId, ip, ua);
    const source = await this.getPrimarySource(channelId);

    try {
      const response = await axios.get(source.url, {
        timeout: 10000,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-Server/1.0',
        },
      });

      const effectiveUrl = response.request?.res?.responseUrl || source.url;
      const rewritten = this.rewriteM3u8Content(response.data, effectiveUrl, token);

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(rewritten);
    } catch (err: any) {
      this.logger.error(`Erreur proxification HLS flux ${channelId}: ${err.message}`);
      res.status(502).send('#EXTM3U\n#EXT-X-ERROR: Flux indisponible');
    }
  }

  async proxySegment(
    encodedUrl: string,
    token: string,
    res: Response,
    range?: string,
  ) {
    if (!token) {
      throw new ForbiddenException('Jeton de lecture requis pour les segments');
    }

    if (token !== 'admin_preview') {
      await this.sharesService.validateAccess(token);
    }

    const targetUrl = Buffer.from(encodedUrl, 'base64url').toString('utf-8');

    try {
      const headers: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-Server/1.0',
      };
      if (range) headers['Range'] = range;

      const response = await axios.get(targetUrl, {
        timeout: 12000,
        responseType: 'stream',
        headers,
      });

      const contentType = String(response.headers['content-type'] || '');
      const isM3u = targetUrl.includes('.m3u') || contentType.includes('mpegurl');

      res.setHeader('Access-Control-Allow-Origin', '*');

      if (isM3u) {
        // C'est une sous-playlist (variant stream ou audio)
        const chunks: any[] = [];
        response.data.on('data', (c: any) => chunks.push(c));
        response.data.on('error', (err: any) => {
          this.logger.error(`Erreur stream sous-playlist: ${err.message}`);
          if (!res.headersSent) res.status(502).end();
        });
        response.data.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          const effectiveUrl = response.request?.res?.responseUrl || targetUrl;
          const rewritten = this.rewriteM3u8Content(body, effectiveUrl, token);

          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.send(rewritten);
        });
        return;
      }

      res.setHeader('Content-Type', contentType || 'video/MP2T');

      if (response.headers['content-length']) {
        res.setHeader('Content-Length', String(response.headers['content-length']));
      }
      if (response.headers['content-range']) {
        res.setHeader('Content-Range', String(response.headers['content-range']));
      }

      response.data.pipe(res);
      response.data.on('error', (err: any) => {
        this.logger.error(`Erreur lecture chunk vidéo: ${err.message}`);
        if (!res.headersSent) res.status(502).end();
      });
      res.on('close', () => {
        response.data.destroy();
      });
    } catch (err: any) {
      this.logger.error(`Erreur streaming segment: ${err.message}`);
      res.status(502).end();
    }
  }
}
