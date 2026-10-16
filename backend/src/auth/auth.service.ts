import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly ssoBaseUrl = (process.env.SSO_BASE_URL || 'https://sso-a.oussamma.tn').replace(/\/$/, '');
  private readonly clientId = process.env.SSO_CLIENT_ID || 'client_iptv_server';
  private readonly clientSecret = process.env.SSO_CLIENT_SECRET || 'sec_iptv_platform_secret_2026';
  private readonly redirectUri = process.env.SSO_REDIRECT_URI || 'https://iptv.oussamma.tn/auth/callback';
  private readonly jwtSecret = process.env.JWT_SECRET || 'iptv-server-super-secret-production-key-2026';
  private readonly initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL || 'oussammabenhassine@gmail.com';

  constructor(private readonly prisma: PrismaService) {}

  generateAuthUrl(): { url: string; state: string; codeVerifier: string } {
    const nonce = crypto.randomBytes(16).toString('hex');
    const signature = crypto.createHmac('sha256', this.jwtSecret).update(`state:${nonce}`).digest('hex');
    const state = `${nonce}.${signature}`;
    
    // PKCE
    const codeVerifier = crypto.createHmac('sha256', this.jwtSecret).update(`pkce:${nonce}`).digest('base64url').substring(0, 64);
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const authUrl = new URL(`${this.ssoBaseUrl}/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return { url: authUrl.toString(), state, codeVerifier };
  }

  verifyState(state: string): boolean {
    if (!state || typeof state !== 'string') return false;
    const [nonce, signature] = state.split('.');
    if (!nonce || !signature) return false;
    const expected = crypto.createHmac('sha256', this.jwtSecret).update(`state:${nonce}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  }

  deriveVerifier(state: string): string {
    const [nonce] = state.split('.');
    return crypto.createHmac('sha256', this.jwtSecret).update(`pkce:${nonce}`).digest('base64url').substring(0, 64);
  }

  async handleCallback(code: string, state: string) {
    if (!this.verifyState(state)) {
      throw new UnauthorizedException('État OIDC (State) invalide ou altéré');
    }

    const codeVerifier = this.deriveVerifier(state);

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });

    try {
      const tokenRes = await axios.post(`${this.ssoBaseUrl}/oauth/token`, tokenParams.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      });

      const accessToken = tokenRes.data.access_token;

      // Userinfo
      const userinfoRes = await axios.get(`${this.ssoBaseUrl}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userInfo = userinfoRes.data;
      const ssoSub = userInfo.sub || userInfo.id;
      const email = userInfo.email;
      const name = userInfo.name || userInfo.preferred_username || (email ? email.split('@')[0] : 'Utilisateur');
      const avatarUrl = userInfo.picture || userInfo.avatar_url || null;

      // Détection Admin
      const isInitialAdmin = email && email.toLowerCase() === this.initialAdminEmail.toLowerCase();
      const ssoRoles = userInfo.roles || [];
      const isAdmin = isInitialAdmin || ssoRoles.includes('ADMIN') || ssoRoles.includes('admin');

      // Création automatique ou mise à jour du profil applicatif
      let user = await this.prisma.user.findUnique({
        where: { ssoSub: String(ssoSub) },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            ssoSub: String(ssoSub),
            email: email || `${ssoSub}@sso.local`,
            name,
            avatarUrl,
            role: isAdmin ? 'ADMIN' : 'USER',
          },
        });
        this.logger.log(`Nouvel utilisateur SSO enregistré : ${user.email} (${user.role})`);
      } else {
        // MAJ si admin initial
        if (isAdmin && user.role !== 'ADMIN') {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN', name, avatarUrl },
          });
        }
      }

      // Création du JWT applicatif
      const sessionToken = jwt.sign(
        {
          sub: user.id,
          ssoSub: user.ssoSub,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        this.jwtSecret,
        { expiresIn: '30d' },
      );

      return { user, sessionToken };
    } catch (err: any) {
      this.logger.error(`Erreur callback OIDC : ${err.response?.data?.error || err.message}`);
      throw new UnauthorizedException('Échec de la validation du code OIDC');
    }
  }

  verifyJwt(token: string) {
    try {
      return jwt.verify(token, this.jwtSecret) as any;
    } catch {
      return null;
    }
  }
}
