import { Module } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';
import { PrismaService } from '../common/prisma.service';
import { SecurityService } from '../common/security.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SourcesController],
  providers: [SourcesService, PrismaService, SecurityService],
  exports: [SourcesService],
})
export class SourcesModule {}
