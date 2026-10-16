import { Module } from '@nestjs/common';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';
import { PrismaService } from '../common/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SharesController],
  providers: [SharesService, PrismaService],
  exports: [SharesService],
})
export class SharesModule {}
