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
  createDealerSchema,
  performanceRangeSchema,
  updateDealerProfileSchema,
  type CreateDealerInput,
  type PerformanceRange,
  type UpdateDealerProfileInput,
} from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { DealerImagesService } from './dealer-images.service';
import { DealersService, type DealerPerformance } from './dealers.service';

@Controller('dealers')
export class DealersController {
  constructor(
    private readonly dealersService: DealersService,
    private readonly dealerImagesService: DealerImagesService,
  ) {}

  @Get()
  async listActive(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.dealersService.listActive({
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
      data: await this.dealersService.listForMap(),
    };
  }

  @Get('seo-slugs')
  async seoSlugs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.dealersService.listSeoSlugs({
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
      data: await this.dealersService.listMine(user.id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/performance')
  async minePerformance(
    @CurrentUser() user: User,
    @Query('range', new ZodValidationPipe(performanceRangeSchema))
    range: PerformanceRange,
  ): Promise<ApiSuccess<DealerPerformance>> {
    return {
      success: true,
      data: await this.dealersService.performance(user.id, range),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Patch('mine')
  async updateMine(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(updateDealerProfileSchema))
    body: UpdateDealerProfileInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.updateMine(user, body),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('dealerApply')
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

  @Get('id/:id/images')
  async listImages(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealerImagesService.listForDealer(id),
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
      data: await this.dealerImagesService.uploadForOwner(user, id, file),
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
      data: await this.dealerImagesService.removeForOwner(user, id, imageId),
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
