import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@throttlelk/validation';
import { EmailService } from '../notifications/email.service';
import { requireJwtSecrets } from '../common/jwt-secrets';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { AuthToken, type AuthTokenType } from './auth-token.entity';
import { RefreshSession } from './refresh-session.entity';
import { classifyRefreshSession } from './refresh-reuse';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    @InjectRepository(AuthToken)
    private readonly tokens: Repository<AuthToken>,
    @InjectRepository(RefreshSession)
    private readonly sessions: Repository<RefreshSession>,
  ) {}

  async register(input: RegisterInput) {
    const user = await this.usersService.createUser(input, [
      'buyer',
      'seller',
    ]);
    try {
      await this.sendEmailVerification(user);
    } catch (err) {
      // Token is stored; the user can resend. Do not fail registration.
      this.logger.warn(
        `Verification email failed userId=${user.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return this.issueTokens(user);
  }

  async login(input: LoginInput) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Account is not active' },
      });
    }
    // Google-only accounts have no password. Same error as a wrong password.
    if (!user.passwordHash) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }
    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }
    return this.issueTokens(user);
  }

  async googleCallback(input: {
    code: string;
    nonce: string;
    codeVerifier: string;
  }) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET')?.trim();
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'GOOGLE_UNAVAILABLE',
          message: 'Google sign-in is unavailable',
        },
      });
    }

    const redirectUri = `${this.webBase()}/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        code_verifier: input.codeVerifier,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!tokenResponse.ok) {
      await tokenResponse.text().catch(() => undefined);
      throw this.googleFailed();
    }

    let idToken: string | undefined;
    try {
      const body: unknown = await tokenResponse.json();
      if (
        body &&
        typeof body === 'object' &&
        'id_token' in body &&
        typeof body.id_token === 'string'
      ) {
        idToken = body.id_token;
      }
    } catch {
      throw this.googleFailed();
    }
    if (!idToken) throw this.googleFailed();

    const profile = await this.verifyGoogleIdToken(idToken, clientId, input.nonce);
    const picture = googlePictureUrl(profile.picture);
    const email = profile.email?.trim().toLowerCase();
    if (!email || profile.email_verified !== true) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'GOOGLE_EMAIL_UNVERIFIED',
          message: 'Google sign-in failed',
        },
      });
    }

    // ASVS 6.8.1 — identity is (provider=google, sub), not email alone.
    let user = await this.usersService.findByGoogleSub(profile.sub);
    if (!user) {
      const byEmail = await this.usersService.findByEmail(email);
      if (byEmail) {
        if (byEmail.googleSub && byEmail.googleSub !== profile.sub) {
          throw this.googleFailed();
        }
        user = await this.usersService.linkGoogleAccount(byEmail, profile.sub);
      } else {
        const names = googleDisplayNames(profile);
        user = await this.usersService.createGoogleUser({
          email,
          googleSub: profile.sub,
          firstName: names.firstName,
          lastName: names.lastName,
          avatarUrl: picture,
        });
      }
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Account is not active' },
      });
    }
    user = await this.usersService.applyGoogleAvatar(user, picture);
    return this.issueTokens(user);
  }

  private googleFailed() {
    return new UnauthorizedException({
      success: false,
      error: { code: 'GOOGLE_FAILED', message: 'Google sign-in failed' },
    });
  }

  /**
   * ASVS 6.8.2 — reject unsigned or invalid ID tokens.
   * Signature, iss, aud, and exp come from verifyIdToken; nonce is checked here.
   */
  private async verifyGoogleIdToken(
    idToken: string,
    clientId: string,
    nonce: string,
  ): Promise<TokenPayload & { sub: string }> {
    let payload: TokenPayload | undefined;
    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw this.googleFailed();
    }

    if (!payload?.sub || !payload.exp || payload.exp * 1000 <= Date.now()) {
      throw this.googleFailed();
    }
    if (
      payload.iss !== 'https://accounts.google.com' &&
      payload.iss !== 'accounts.google.com'
    ) {
      throw this.googleFailed();
    }
    const audiences = Array.isArray(payload.aud)
      ? payload.aud
      : payload.aud
        ? [payload.aud]
        : [];
    if (!audiences.includes(clientId)) {
      throw this.googleFailed();
    }
    const tokenNonce = payload.nonce ?? '';
    if (!tokenNonce || !safeEqual(tokenNonce, nonce)) {
      throw this.googleFailed();
    }
    return { ...payload, sub: payload.sub };
  }

  private jwtSecrets() {
    return requireJwtSecrets({
      NODE_ENV: this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV,
      JWT_ACCESS_SECRET:
        this.config.get<string>('JWT_ACCESS_SECRET') ??
        process.env.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET:
        this.config.get<string>('JWT_REFRESH_SECRET') ??
        process.env.JWT_REFRESH_SECRET,
    });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(refreshToken, {
        secret: this.jwtSecrets().refresh,
      });
      const session = await this.sessions.findOne({
        where: { tokenHash: this.hashToken(refreshToken) },
      });
      const verdict = classifyRefreshSession({
        session,
        payloadSub: payload.sub,
      });
      if (verdict === 'reuse' && session) {
        await this.usersService.revokeRefreshSessions(session.userId);
        throw new Error('session reuse');
      }
      if (verdict !== 'ok' || !session) {
        throw new Error('session invalid');
      }
      const revoked = await this.sessions
        .createQueryBuilder()
        .update(RefreshSession)
        .set({ revokedAt: () => 'NOW()' })
        .where('id = :id', { id: session.id })
        .andWhere('revoked_at IS NULL')
        .execute();
      if (!revoked.affected) {
        await this.usersService.revokeRefreshSessions(session.userId);
        throw new Error('session reuse');
      }
      const user = await this.usersService.findByIdOrThrow(payload.sub);
      if (user.status !== 'active') {
        throw new Error('account disabled');
      }
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'INVALID_REFRESH', message: 'Refresh token invalid' },
      });
    }
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      const session = await this.sessions.findOne({
        where: { tokenHash: this.hashToken(refreshToken) },
      });
      if (session && !session.revokedAt) {
        session.revokedAt = new Date();
        await this.sessions.save(session);
      }
    }
    return { ok: true };
  }

  /** Always succeeds to avoid email enumeration. */
  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.usersService.findByEmail(input.email);
    if (user && user.status === 'active') {
      const raw = await this.createToken(user.id, 'password_reset', 60);
      const link = `${this.webBase()}/en/reset-password?token=${raw}`;
      try {
        await this.email.send(
          user.email,
          'Reset your ThrottleLK password',
          `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 60 minutes.</p>`,
        );
      } catch (err) {
        // Still return 200 so this endpoint cannot enumerate emails.
        this.logger.warn(
          `Password-reset email failed userId=${user.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return {
      ok: true,
      message: 'If that email exists, we sent a reset link.',
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const row = await this.consumeToken(input.token, 'password_reset');
    await this.usersService.setPassword(row.userId, input.password);
    await this.sessions
      .createQueryBuilder()
      .update(RefreshSession)
      .set({ revokedAt: () => 'NOW()' })
      .where('user_id = :userId', { userId: row.userId })
      .andWhere('revoked_at IS NULL')
      .execute();
    return { ok: true };
  }

  async verifyEmail(input: VerifyEmailInput) {
    const row = await this.consumeToken(input.token, 'email_verify');
    await this.usersService.markEmailVerified(row.userId);
    return { ok: true };
  }

  async resendVerification(user: User) {
    if (user.emailVerifiedAt) {
      return { ok: true, message: 'Email already verified' };
    }
    await this.sendEmailVerification(user);
    return { ok: true, message: 'Verification email sent' };
  }

  private async sendEmailVerification(user: User) {
    const raw = await this.createToken(user.id, 'email_verify', 60 * 24);
    const link = `${this.webBase()}/en/verify-email?token=${raw}`;
    await this.email.send(
      user.email,
      'Verify your ThrottleLK email',
      `<p>Welcome to ThrottleLK.</p><p><a href="${link}">Verify your email</a></p><p>Or open: ${link}</p>`,
    );
  }

  private webBase() {
    return (
      this.config.get<string>('WEB_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async createToken(
    userId: string,
    type: AuthTokenType,
    expiresMinutes: number,
  ) {
    await this.tokens
      .createQueryBuilder()
      .delete()
      .from(AuthToken)
      .where('user_id = :userId', { userId })
      .andWhere('type = :type', { type })
      .andWhere('used_at IS NULL')
      .execute();
    const raw = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresMinutes * 60_000);
    await this.tokens.save(
      this.tokens.create({
        userId,
        type,
        tokenHash: this.hashToken(raw),
        expiresAt,
        usedAt: null,
      }),
    );
    return raw;
  }

  private async consumeToken(raw: string, type: AuthTokenType) {
    const row = await this.tokens.findOne({
      where: {
        tokenHash: this.hashToken(raw),
        type,
      },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'This link is invalid or has expired',
        },
      });
    }
    const used = await this.tokens
      .createQueryBuilder()
      .update(AuthToken)
      .set({ usedAt: () => 'NOW()' })
      .where('id = :id', { id: row.id })
      .andWhere('used_at IS NULL')
      .execute();
    if (!used.affected) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'This link is invalid or has expired',
        },
      });
    }
    return row;
  }

  private async issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email, jti: randomUUID() };
    const secrets = this.jwtSecrets();
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: secrets.access,
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: secrets.refresh,
      expiresIn: '7d',
    });
    await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
        revokedAt: null,
      }),
    );
    return {
      accessToken,
      refreshToken,
      user: this.usersService.toPublic(user),
    };
  }
}

function googleDisplayNames(profile: TokenPayload): {
  firstName: string;
  lastName: string;
} {
  let given = profile.given_name;
  let family = profile.family_name;
  if (!given?.trim() && !family?.trim() && profile.name?.trim()) {
    const parts = profile.name.trim().split(/\s+/);
    given = parts.shift();
    family = parts.join(' ');
  }
  return {
    firstName: clipName(given, 'Rider'),
    lastName: clipName(family, 'User'),
  };
}

/**
 * ASVS 1.2.2 — only https URLs on Google's image host may become an avatar src.
 */
function googlePictureUrl(raw: string | undefined): string | null {
  if (!raw || raw.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (host !== 'googleusercontent.com' && !host.endsWith('.googleusercontent.com')) {
    return null;
  }
  if (/=s\d+(-[a-z]+)?$/i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/=s\d+(-[a-z]+)?$/i, '=s256-c');
  } else {
    url.pathname = `${url.pathname}=s256-c`;
  }
  const value = url.toString();
  return value.length > 2048 ? null : value;
}

function clipName(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed.slice(0, 80) : fallback;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}