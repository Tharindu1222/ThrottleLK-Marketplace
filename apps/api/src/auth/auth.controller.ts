import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
import { RateLimit } from '../common/rate-limit';
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
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ): Promise<ApiSuccess<Awaited<ReturnType<AuthService['register']>>>> {
    const data = await this.authService.register(body);
    return { success: true, data };
  }

  @RateLimit('login')
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<ApiSuccess<Awaited<ReturnType<AuthService['login']>>>> {
    const data = await this.authService.login(body);
    return { success: true, data };
  }

  @RateLimit('refresh')
  @Post('refresh')
  async refresh(
    @Body(new ZodValidationPipe(z.object({ refreshToken: z.string().min(10) })))
    body: { refreshToken: string },
  ): Promise<ApiSuccess<Awaited<ReturnType<AuthService['refresh']>>>> {
    const data = await this.authService.refresh(body.refreshToken);
    return { success: true, data };
  }

  @RateLimit('write')
  @Post('logout')
  async logout(
    @Body(
      new ZodValidationPipe(
        z.object({ refreshToken: z.string().min(10).optional() }),
      ),
    )
    body: { refreshToken?: string },
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.authService.logout(body.refreshToken),
    };
  }

  @RateLimit('auth')
  @Post('forgot-password')
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema))
    body: ForgotPasswordInput,
  ): Promise<ApiSuccess<unknown>> {
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
}
