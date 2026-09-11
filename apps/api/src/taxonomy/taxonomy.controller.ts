import { Controller, Get, Param } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import { TaxonomyService } from './taxonomy.service';

@Controller()
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get('brands')
  async brands(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.taxonomy.listBrands() };
  }

  @Get('brands/:slug')
  async brand(@Param('slug') slug: string): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.taxonomy.getBrandBySlug(slug) };
  }

  @Get('brands/:brandId/models')
  async models(
    @Param('brandId') brandId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.taxonomy.listModelsByBrand(brandId),
    };
  }

  @Get('models/:slug')
  async model(@Param('slug') slug: string): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.taxonomy.getModelBySlug(slug) };
  }

  @Get('categories')
  async categories(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.taxonomy.listCategories() };
  }

  @Get('locations/districts')
  async districts(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.taxonomy.listDistricts() };
  }

  @Get('locations/districts/by-slug/:slug')
  async districtBySlug(
    @Param('slug') slug: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.taxonomy.getDistrictBySlug(slug),
    };
  }

  @Get('locations/districts/:districtId/cities')
  async cities(
    @Param('districtId') districtId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.taxonomy.listCities(districtId),
    };
  }
}
