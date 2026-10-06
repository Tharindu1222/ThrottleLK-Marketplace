import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiSuccess } from '@throttlelk/types';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
} from '@throttlelk/validation';
import { z } from 'zod';

const googleCallbackSchema = z.object({
  code: z.string().trim().min(1).max(2048),
  state: z.string().trim().min(1).max(512),
  nonce: z.string().trim().min(1).max(512),
  codeVerifier: z
    .string()
    .trim()
    .min(43)
    .max(128)
    .regex(/^[A-Za-z0-9\-._~]+$/),
});
import {
  authCookieNames,
  authCookieOptions,
  isProductionEnv,
  readCookie,
} from '../common/auth-cookies';
import { RateLimit } from '../common/rate-limit';
import { assertRequestCaptcha } from '../common/turnstile';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @RateLimit('auth')
  @Post('register')
  async register(
    @Req() req: Request,
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccess<{ user: unknown }>> {
    await assertRequestCaptcha(req, body.captchaToken);
    const data = await this.authService.register(body);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { success: true, data: { user: data.user } };
  }

  @RateLimit('login')
  @Post('login')
  async login(
    @Req() req: Request,
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccess<{ user: unknown }>> {
    await assertRequestCaptcha(req, body.captchaToken);
    const data = await this.authService.login(body);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { success: true, data: { user: data.user } };
  }

  @RateLimit('login')
  @Post('google/callback')
  async googleCallback(
    @Body(new ZodValidationPipe(googleCallbackSchema))
    body: z.infer<typeof googleCallbackSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccess<{ user: unknown }>> {
    const data = await this.authService.googleCallback(body);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { success: true, data: { user: data.user } };
  }

  @RateLimit('refresh')
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodValidationPipe(z.object({ refreshToken: z.string().min(10).optional() })))
    body: { refreshToken?: string },
  ): Promise<ApiSuccess<{ user: unknown }>> {
    const token = body.refreshToken ?? this.refreshFromRequest(req);
    const data = await this.authService.refresh(token ?? '');
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return { success: true, data: { user: data.user } };
  }

  @RateLimit('write')
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(
      new ZodValidationPipe(
        z.object({ refreshToken: z.string().min(10).optional() }),
      ),
    )
    body: { refreshToken?: string },
  ): Promise<ApiSuccess<unknown>> {
    const token = body.refreshToken ?? this.refreshFromRequest(req);
    const data = await this.authService.logout(token);
    this.clearAuthCookies(res);
    return { success: true, data };
  }

  @RateLimit('auth')
  @Post('forgot-password')
  async forgotPassword(
    @Req() req: Request,
    @Body(new ZodValidationPipe(forgotPasswordSchema))
    body: ForgotPasswordInput,
  ): Promise<ApiSuccess<unknown>> {
    await assertRequestCaptcha(req, body.captchaToken);
    return {
      success: true,
      data: await this.authService.forgotPassword(body),
    };
  }

  @RateLimit('auth')
  @Post('reset-password')
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.authService.resetPassword(body),
    };
  }

  @RateLimit('auth')
  @Post('verify-email')
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.authService.verifyEmail(body),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('auth')
  @Post('resend-verification')
  async resendVerification(
    @CurrentUser() user: User,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.authService.resendVerification(user),
    };
  }

  private refreshFromRequest(req: Request): string | undefined {
    const header = req.headers.cookie;
    const production = isProductionEnv();
    return (
      readCookie(header, authCookieNames(production).refresh) ??
      readCookie(header, authCookieNames(false).refresh)
    );
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const production = isProductionEnv();
    const names = authCookieNames(production);
    res.cookie(
      names.access,
      accessToken,
      authCookieOptions({ production, maxAgeMs: 15 * 60 * 1000 }),
    );
    res.cookie(
      names.refresh,
      refreshToken,
      authCookieOptions({ production, maxAgeMs: 7 * 24 * 60 * 60 * 1000 }),
    );
  }

  private clearAuthCookies(res: Response) {
    const production = isProductionEnv();
    for (const names of [authCookieNames(production), authCookieNames(false)]) {
      res.clearCookie(names.access, { path: '/', httpOnly: true, sameSite: 'lax', secure: production });
      res.clearCookie(names.refresh, { path: '/', httpOnly: true, sameSite: 'lax', secure: production });
    }
  }
}
