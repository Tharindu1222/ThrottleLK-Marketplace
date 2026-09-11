import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import {
  createDealerSchema,
  type CreateDealerInput,
} from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { DealersService } from './dealers.service';

@Controller('dealers')
export class DealersController {
  constructor(private readonly dealersService: DealersService) {}

  @Get()
  async listActive(): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.listActive(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async mine(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.listMine(user.id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createDealerSchema)) body: CreateDealerInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.create(user, body),
    };
  }

  @Get(':slug')
  async bySlug(@Param('slug') slug: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.getPublicBySlug(slug),
    };
  }
}
