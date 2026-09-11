import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@throttlelk/validation';
import { EmailService } from '../notifications/email.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { AuthToken, type AuthTokenType } from './auth-token.entity';
import { RefreshSession } from './refresh-session.entity';

@Injectable()
export class AuthService {
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
    void this.sendEmailVerification(user);
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

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(refreshToken, {
        secret:
          this.config.get<string>('JWT_REFRESH_SECRET') ?? 'change-me-refresh',
      });
      const session = await this.sessions.findOne({
        where: { tokenHash: this.hashToken(refreshToken) },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt.getTime() < Date.now() ||
        session.userId !== payload.sub
      ) {
        throw new Error('session invalid');
      }
      session.revokedAt = new Date();
      await this.sessions.save(session);
      const user = await this.usersService.findByIdOrThrow(payload.sub);
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
      void this.email.send(
        user.email,
        'Reset your ThrottleLK password',
        `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 60 minutes.</p>`,
      );
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
    row.usedAt = new Date();
    await this.tokens.save(row);
    return row;
  }

  private async issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email, jti: randomUUID() };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'change-me-access',
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret:
        this.config.get<string>('JWT_REFRESH_SECRET') ?? 'change-me-refresh',
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