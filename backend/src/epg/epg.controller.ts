import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { EpgService } from './epg.service';

@ApiTags('EPG')
@Controller('api/v1/epg')
export class EpgController {
  constructor(private readonly epgService: EpgService) {}

  @Get()
  @ApiOperation({ summary: 'Guide des programmes XMLTV EPG' })
  @ApiProduces('application/xml')
  async getEpg(@Res() res: Response) {
    const xml = await this.epgService.generateXmltv();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="epg.xml"');
    return res.send(xml);
  }
}
