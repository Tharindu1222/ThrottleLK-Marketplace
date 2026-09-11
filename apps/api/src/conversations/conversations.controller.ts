import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import {
  sendConversationMessageSchema,
  startConversationSchema,
  type SendConversationMessageInput,
  type StartConversationInput,
} from '@throttlelk/validation';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  async list(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.conversations.listForUser(user.id),
    };
  }

  @Get(':id')
  async get(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.conversations.getForUser(user.id, id),
    };
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  async start(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(startConversationSchema))
    body: StartConversationInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.conversations.start(
        user.id,
        body.listingId,
        body.message,
      ),
    };
  }

  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Post(':id/messages')
  async reply(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendConversationMessageSchema))
    body: SendConversationMessageInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.conversations.reply(user.id, id, body.message),
    };
  }
}
