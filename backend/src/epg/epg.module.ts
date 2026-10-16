import { Module } from '@nestjs/common';
import { EpgService } from './epg.service';
import { EpgController } from './epg.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [EpgController],
  providers: [EpgService, PrismaService],
  exports: [EpgService],
})
export class EpgModule {}
