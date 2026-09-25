import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { ApiSuccess } from '@throttlelk/types';
import { createPromoRequestMetaSchema } from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { User } from '../users/user.entity';
import { PromotionsService } from './promotions.service';
import type { PromoSubjectType } from './promo-package.entity';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get('packages')
  async packages(
    @Query('kind') kind?: string,
  ): Promise<ApiSuccess<unknown>> {
    const k = kind === 'part' ? 'part' : 'bike';
    return {
      success: true,
      data: await this.promotions.listPublicPackages(k as PromoSubjectType),
    };
  }

  @Get('payment-info')
  async paymentInfo(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.paymentInfo() };
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async status(
    @CurrentUser() user: User,
    @Query('listingId') listingId?: string,
    @Query('partListingId') partListingId?: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.promotions.statusFor(user.id, listingId, partListingId),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async mine(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.mineStatuses(user.id) };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('upload')
  @Post('requests')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async create(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ): Promise<ApiSuccess<unknown>> {
    const parsed = createPromoRequestMetaSchema.safeParse({
      packageId: body.packageId,
      listingId: body.listingId || undefined,
      partListingId: body.partListingId || undefined,
    });
    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: parsed.error.flatten(),
        },
      });
    }
    const meta = parsed.data;
    return {
      success: true,
      data: await this.promotions.createRequest(user, meta, file),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('upload')
  @Patch('requests/:id/slip')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async replaceSlip(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.promotions.replaceSlip(user, id, file),
    };
  }
}
