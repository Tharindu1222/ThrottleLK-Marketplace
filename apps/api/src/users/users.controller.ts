import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { ApiSuccess } from '@throttlelk/types';
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User): ApiSuccess<ReturnType<UsersService['toPublic']>> {
    return { success: true, data: this.usersService.toPublic(user) };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Patch('me')
  async updateMe(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.usersService.updateProfile(user, body),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('upload')
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.usersService.uploadAvatar(user, file),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Delete('me/avatar')
  async removeAvatar(
    @CurrentUser() user: User,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.usersService.removeAvatar(user),
    };
  }
}
