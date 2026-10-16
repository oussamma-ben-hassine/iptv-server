import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SourcesModule } from './sources/sources.module';
import { ChannelsModule } from './channels/channels.module';
import { SharesModule } from './shares/shares.module';
import { StreamingModule } from './streaming/streaming.module';
import { EpgModule } from './epg/epg.module';
import { MoviesModule } from './movies/movies.module';
import { AiModule } from './ai/ai.module';
import { PrismaService } from './common/prisma.service';
import { SecurityService } from './common/security.service';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    AuthModule,
    SourcesModule,
    ChannelsModule,
    SharesModule,
    StreamingModule,
    EpgModule,
    MoviesModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService, SecurityService],
})
export class AppModule {}
