import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { User } from '../users/user.entity';
import { PartListingsService } from './part-listings.service';

@Controller('spare-parts')
export class SparePartsController {
  constructor(private readonly partListingsService: PartListingsService) {}

  @Get()
  async list(
    @Query('brandId') brandId?: string,
    @Query('modelId') modelId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('districtId') districtId?: string,
    @Query('cityId') cityId?: string,
    @Query('partsDealerId') partsDealerId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('condition') condition?: string,
    @Query('sort') sort?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partListingsService.listPublic({
      kind: 'spare',
      brandId,
      modelId,
      categoryId,
      districtId,
      cityId,
      partsDealerId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      condition,
      sort,
      q,
      page,
      limit,
    });
    return { success: true, data: items, meta };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  async getOne(
    @Param('slug') slug: string,
    @Req() req: Request & { user?: User },
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.getPublicBySlug(
        slug,
        req.user ?? null,
        'spare',
      ),
    };
  }
}
