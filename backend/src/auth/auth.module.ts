import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, PrismaService],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
