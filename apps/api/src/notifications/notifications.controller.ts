import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  notificationPreferencesSchema,
  type UpdateNotificationPreferencesInput,
} from '@throttlelk/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from '../users/users.service';
import type { ApiSuccess } from '@throttlelk/types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { User } from '../users/user.entity';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly users: UsersService,
  ) {}

  @Get('preferences')
  preferences(@CurrentUser() user: User): ApiSuccess<unknown> {
    return { success: true, data: this.users.notificationPreferences(user) };
  }

  @RateLimit('write')
  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(notificationPreferencesSchema))
    input: UpdateNotificationPreferencesInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.users.updateNotificationPreferences(user, input),
    };
  }

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unread') unread?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.notifications.listForUser(user.id, {
      page,
      limit,
      unread,
    });
    return { success: true, data: items, meta };
  }

  @Get('unread-count')
  async unread(
    @CurrentUser() user: User,
  ): Promise<ApiSuccess<{ count: number }>> {
    return {
      success: true,
      data: { count: await this.notifications.unreadCount(user.id) },
    };
  }

  @RateLimit('write')
  @Patch('read-all')
  async readAll(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.notifications.markAllRead(user.id),
    };
  }

  @RateLimit('write')
  @Patch(':id/read')
  async readOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.notifications.markRead(user.id, id),
    };
  }
}
