import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class EpgService {
  constructor(private readonly prisma: PrismaService) {}

  async generateXmltv(): Promise<string> {
    const channels = await this.prisma.channel.findMany({
      where: { isActive: true },
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<!DOCTYPE tv SYSTEM "xmltv.dtd">\n';
    xml += '<tv generator-info-name="IPTV-Server-EPG" source-info-url="https://iptv.oussamma.tn">\n';

    for (const ch of channels) {
      const epgId = ch.epgChannelId || ch.slug;
      xml += `  <channel id="${epgId}">\n`;
      xml += `    <display-name lang="${ch.language || 'ara'}">${ch.name}</display-name>\n`;
      if (ch.logoUrl) {
        xml += `    <icon src="${ch.logoUrl}" />\n`;
      }
      xml += `  </channel>\n`;
    }

    // Programme d'exemple / direct générique
    const now = new Date();
    const startStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14) + ' +0000';
    const future = new Date(now.getTime() + 4 * 3600 * 1000);
    const endStr = future.toISOString().replace(/[-:T]/g, '').slice(0, 14) + ' +0000';

    for (const ch of channels) {
      const epgId = ch.epgChannelId || ch.slug;
      xml += `  <programme start="${startStr}" stop="${endStr}" channel="${epgId}">\n`;
      xml += `    <title lang="${ch.language || 'ara'}">${ch.name} - En Direct</title>\n`;
      xml += `    <desc lang="${ch.language || 'ara'}">Diffusion du flux continu officiel pour ${ch.name}</desc>\n`;
      xml += `  </programme>\n`;
    }

    xml += '</tv>';
    return xml;
  }
}
