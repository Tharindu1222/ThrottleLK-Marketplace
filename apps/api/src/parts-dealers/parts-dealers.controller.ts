import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { ApiSuccess } from '@throttlelk/types';
import {
  createPartsDealerSchema,
  performanceRangeSchema,
  updatePartsDealerProfileSchema,
  type CreatePartsDealerInput,
  type PerformanceRange,
  type UpdatePartsDealerProfileInput,
} from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { PartsDealerImagesService } from './parts-dealer-images.service';
import {
  PartsDealersService,
  type PartsDealerPerformance,
} from './parts-dealers.service';

@Controller('parts-dealers')
export class PartsDealersController {
  constructor(
    private readonly partsDealersService: PartsDealersService,
    private readonly partsDealerImagesService: PartsDealerImagesService,
  ) {}

  @Get()
  async listActive(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partsDealersService.listActive({
      page,
      limit,
      q,
    });
    return { success: true, data: items, meta };
  }

  @Get('map')
  async map(): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.listForMap(),
    };
  }

  @Get('seo-slugs')
  async seoSlugs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partsDealersService.listSeoSlugs({
      page,
      limit,
    });
    return { success: true, data: items, meta };
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async mine(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.listMine(user.id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/performance')
  async minePerformance(
    @CurrentUser() user: User,
    @Query('range', new ZodValidationPipe(performanceRangeSchema))
    range: PerformanceRange,
  ): Promise<ApiSuccess<PartsDealerPerformance>> {
    return {
      success: true,
      data: await this.partsDealersService.performance(user.id, range),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Patch('mine')
  async updateMine(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(updatePartsDealerProfileSchema))
    body: UpdatePartsDealerProfileInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.updateMine(user, body),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('dealerApply')
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createPartsDealerSchema))
    body: CreatePartsDealerInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.create(user, body),
    };
  }

  @Get('id/:id/images')
  async listImages(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealerImagesService.listForPartsDealer(id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('upload')
  @Post('id/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealerImagesService.uploadForOwner(user, id, file),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Delete('id/:id/images/:imageId')
  async deleteImage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealerImagesService.removeForOwner(
        user,
        id,
        imageId,
      ),
    };
  }

  @Get(':slug')
  async bySlug(@Param('slug') slug: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.getPublicBySlug(slug),
    };
  }
}
