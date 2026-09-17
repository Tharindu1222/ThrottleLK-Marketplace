import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { User } from '../users/user.entity';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.notifications.listForUser(user.id),
    };
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
