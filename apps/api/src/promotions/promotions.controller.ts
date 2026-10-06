import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import type { CreatePromoCheckoutInput } from '@throttlelk/validation';
import { createPromoCheckoutSchema } from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { ListingPackagesService } from '../listing-packages/listing-packages.service';
import { PromotionsService } from './promotions.service';
import type { PromoSubjectType } from './promo-package.entity';

@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotions: PromotionsService,
    private readonly listingPackages: ListingPackagesService,
  ) {}

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

  @Get('live')
  async live(
    @Query('surface') surface?: string,
    @Query('kind') kind?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<ApiSuccess<unknown>> {
    if (surface !== 'browse' && surface !== 'detail') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'surface must be browse or detail',
        },
      });
    }
    const k = kind === 'part' ? 'part' : 'bike';
    const parsed = Number.parseInt(limitRaw ?? '8', 10);
    const limit = Number.isFinite(parsed) ? parsed : 8;
    return {
      success: true,
      data: await this.promotions.listLiveForSurface(surface, k, limit),
    };
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
  @Post('checkout')
  async checkout(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createPromoCheckoutSchema))
    body: CreatePromoCheckoutInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.promotions.createCheckout(user, body),
    };
  }

  /** PayHere IPN — public, application/x-www-form-urlencoded, plain OK. */
  @Post('payhere/notify')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain')
  async payhereNotify(
    @Body() body: Record<string, string>,
  ): Promise<string> {
    const orderId = body?.order_id ?? '';
    if (orderId.startsWith('post_')) {
      return this.listingPackages.handlePayHereNotify(body ?? {});
    }
    return this.promotions.handlePayHereNotify(body ?? {});
  }
}
