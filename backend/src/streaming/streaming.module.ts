import { Module } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { StreamingController } from './streaming.controller';
import { PrismaService } from '../common/prisma.service';
import { SharesModule } from '../shares/shares.module';

@Module({
  imports: [SharesModule],
  controllers: [StreamingController],
  providers: [StreamingService, PrismaService],
  exports: [StreamingService],
})
export class StreamingModule {}
