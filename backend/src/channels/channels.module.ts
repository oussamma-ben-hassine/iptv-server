import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { PrismaService } from '../common/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ChannelsController],
  providers: [ChannelsService, PrismaService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
