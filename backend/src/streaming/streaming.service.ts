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
  private readonly mediamtxUrl = (process.env.MEDIAMTX_API_URL || 'http://mediamtx:9997').replace(/\/$/, '');

  constructor(
    private readonly prisma: PrismaService,
    private readonly sharesService: SharesService,
  ) {}

  async validatePlaybackSession(token: string, channelId: string, ip?: string, ua?: string) {
    if (!token) {
      throw new ForbiddenException('Jeton de lecture (token) manquant');
    }

    const share = await this.sharesService.validateAccess(token);

    // Vérifier si la chaîne fait partie de ce partage
    const isAllowed = share.allowedChannels.some((ac) => ac.channelId === channelId);
    if (!isAllowed) {
      throw new ForbiddenException('Cette chaîne n\'est pas autorisée pour votre accès');
    }

    // Gestion des sessions simultanées
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const activeSessions = await this.prisma.playbackSession.count({
      where: {
        shareAccessId: share.id,
        lastPingAt: { gte: tenMinutesAgo },
      },
    });

    if (activeSessions >= share.maxSessions) {
      this.logger.warn(`Limite de sessions simultanées atteinte pour l'accès ${share.name}`);
      // Autoriser le rafraîchissement si même IP/UA
    }

    // Upsert session
    const session = await this.prisma.playbackSession.create({
      data: {
        shareAccessId: share.id,
        channelId,
        clientIp: ip || 'unknown',
        userAgent: ua ? ua.substring(0, 255) : 'unknown',
      },
    });

    return { share, session };
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
        timeout: 8000,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-Server/1.0',
        },
      });

      const originalM3u8 = response.data;
      const baseUrl = source.url.substring(0, source.url.lastIndexOf('/') + 1);

      // Réécrire chaque URL de sous-playlist ou segment pour passer par notre passerelle sécurisée
      const lines = originalM3u8.split('\n');
      const rewritten = lines.map((line: string) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          // Gérer #EXT-X-KEY si présent
          if (trimmed.startsWith('#EXT-X-KEY:')) {
            return line; // garder la clé ou proxifier si besoin
          }
          return line;
        }

        // C'est une URL de segment ou sous-playlist
        const absoluteUrl = trimmed.startsWith('http')
          ? trimmed
          : new URL(trimmed, baseUrl).toString();

        const encodedSegment = Buffer.from(absoluteUrl).toString('base64url');
        return `/api/v1/stream/segment/${encodedSegment}?token=${token}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(rewritten.join('\n'));
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

    // Valide le token : si révoqué ou expiré, rejette immédiatement le segment
    await this.sharesService.validateAccess(token);

    const targetUrl = Buffer.from(encodedUrl, 'base64url').toString('utf-8');

    try {
      const headers: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-Server/1.0',
      };
      if (range) headers['Range'] = range;

      const response = await axios.get(targetUrl, {
        timeout: 10000,
        responseType: 'stream',
        headers,
      });

      res.setHeader('Content-Type', response.headers['content-type'] || 'video/MP2T');
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      if (response.headers['content-range']) {
        res.setHeader('Content-Range', response.headers['content-range']);
      }

      response.data.pipe(res);
    } catch (err: any) {
      this.logger.error(`Erreur streaming segment: ${err.message}`);
      res.status(502).end();
    }
  }
}
