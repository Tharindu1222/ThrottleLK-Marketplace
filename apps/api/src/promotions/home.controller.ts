import { Controller, Get } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import { PromotionsService } from './promotions.service';

@Controller('home')
export class HomeController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get('marketplace-preview')
  async marketplacePreview(): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.promotions.marketplacePreview(),
    };
  }
}
