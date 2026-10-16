import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  @ApiOperation({ summary: 'Initier la connexion SSO OIDC PKCE' })
  login(@Res() res: Response) {
    const { url } = this.authService.generateAuthUrl();
    return res.redirect(url);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Callback OIDC retourné par le SSO' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(`/?auth_error=${encodeURIComponent(errorDescription || error)}`);
    }
    if (!code || !state) {
      return res.redirect('/?auth_error=parametres_manquants');
    }

    try {
      const { user, sessionToken } = await this.authService.handleCallback(code, state);

      // Poser le cookie sécurisé HttpOnly
      res.cookie('iptv_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return res.redirect('/?login_success=1');
    } catch (err: any) {
      return res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Profil utilisateur courant' })
  getMe(@Req() req: Request) {
    const token = req.cookies?.['iptv_session'] || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return { authenticated: false, user: null };
    }
    const decoded = this.authService.verifyJwt(token);
    if (!decoded) {
      return { authenticated: false, user: null };
    }
    return {
      authenticated: true,
      user: decoded,
    };
  }

  @Get('logout')
  @ApiOperation({ summary: 'Déconnexion' })
  logout(@Res() res: Response) {
    res.clearCookie('iptv_session', { path: '/' });
    const ssoLogout = `${process.env.SSO_BASE_URL || 'https://sso-a.oussamma.tn'}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(process.env.APP_URL || 'https://iptv.oussamma.tn')}`;
    return res.redirect(ssoLogout);
  }
}
