import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token =
      request.cookies?.['iptv_session'] ||
      request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Session requise');
    }

    const payload = this.authService.verifyJwt(token);
    if (!payload) {
      throw new UnauthorizedException('Session invalide ou expirée');
    }

    request.user = payload;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(payload.role)) {
      throw new ForbiddenException('Permissions insuffisantes : rôle ADMIN requis');
    }

    return true;
  }
}
