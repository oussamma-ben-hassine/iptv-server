import { Injectable, BadRequestException } from '@nestjs/common';
import * as net from 'net';
import { URL } from 'url';

@Injectable()
export class SecurityService {
  private readonly forbiddenHostPatterns = [
    /^localhost$/i,
    /^127\./,
    /^0\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
    /^docker\.internal$/i,
    /^host\.docker\.internal$/i
  ];

  validateStreamUrl(rawUrl: string): string {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new BadRequestException('URL invalide ou vide');
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      throw new BadRequestException('Format d\'URL invalide');
    }

    if (!['http:', 'https:', 'rtsp:', 'rtmp:'].includes(parsed.protocol)) {
      throw new BadRequestException(`Protocole non autorisé : ${parsed.protocol}`);
    }

    const hostname = parsed.hostname.toLowerCase();

    for (const pattern of this.forbiddenHostPatterns) {
      if (pattern.test(hostname)) {
        throw new BadRequestException('Accès aux adresses réseau internes ou privées interdit (SSRF Protection)');
      }
    }

    return parsed.toString();
  }
}
