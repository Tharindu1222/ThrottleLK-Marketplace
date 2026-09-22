import { Controller, Get } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import { PartCategoriesService } from './part-categories.service';

@Controller('part-categories')
export class PartCategoriesController {
  constructor(private readonly categories: PartCategoriesService) {}

  @Get()
  async list(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.categories.listPublic() };
  }
}
