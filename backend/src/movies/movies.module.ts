import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { PrismaService } from '../common/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MoviesController],
  providers: [MoviesService, PrismaService],
  exports: [MoviesService],
})
export class MoviesModule {}
