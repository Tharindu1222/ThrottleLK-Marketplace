import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiSuccess } from '@throttlelk/types';
import {
  createListingPackageCheckoutSchema,
  type CreateListingPackageCheckoutInput,
} from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { ListingPackagesService } from './listing-packages.service';
import type { PackageAudience } from './listing-post-rules';

@Controller('listing-packages')
export class ListingPackagesController {
  constructor(private readonly packages: ListingPackagesService) {}

  @Get('settings')
  async settings(): Promise<ApiSuccess<unknown>> {
    const row = await this.packages.getSettings();
    return {
      success: true,
      data: {
        privateFreeListings: row.privateFreeListings,
        dealerFreeListings: row.dealerFreeListings,
        partsFreeListings: row.partsFreeListings,
      },
    };
  }

  @Get()
  async list(@Query('audience') audience?: string): Promise<ApiSuccess<unknown>> {
    const parsed: PackageAudience | null =
      audience === 'bike' || audience === 'parts' ? audience : null;
    if (!parsed) return { success: true, data: [] };
    const rows = await this.packages.listPublic(parsed);
    return {
      success: true,
      data: rows.map((pkg) => ({
        id: pkg.id,
        audience: pkg.audience,
        name: pkg.name,
        description: pkg.description,
        priceLkr: pkg.priceLkr,
        listingCount: pkg.listingCount,
      })),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.packages.summary(user.id) };
  }

  @Get('payhere/return')
  @Post('payhere/return')
  async payhereReturn(@Req() req: Request, @Res() res: Response) {
    const url = await this.packages.completePayHereReturn(
      payHereFields(req.query, req.body),
    );
    res.redirect(302, url);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  async checkout(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createListingPackageCheckoutSchema))
    body: CreateListingPackageCheckoutInput,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.packages.createCheckout(user, body) };
  }
}

function payHereFields(
  query: Request['query'],
  body: Request['body'],
): Record<string, string | undefined> {
  const merged: Record<string, unknown> = {
    ...(query ?? {}),
    ...(body && typeof body === 'object' ? body : {}),
  };
  const fields: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (typeof value === 'string') fields[key] = value;
    else if (Array.isArray(value) && typeof value[0] === 'string') fields[key] = value[0];
  }
  return fields;
}
