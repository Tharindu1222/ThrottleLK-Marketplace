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
  createInventoryItemSchema,
  inventoryDocumentTypeSchema,
  markSoldSchema,
  performanceRangeSchema,
  updateDealerProfileSchema,
  updateInventoryItemSchema,
  type CreateDealerInput,
  type CreateInventoryItemInput,
  type InventoryDocumentType,
  type MarkSoldInput,
  type PerformanceRange,
  type UpdateDealerProfileInput,
  type UpdateInventoryItemInput,
} from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { DealerImagesService } from './dealer-images.service';
import { DealersService, type DealerPerformance } from './dealers.service';
import { InventoryService } from './inventory.service';

@Controller('dealers')
export class DealersController {
  constructor(
    private readonly dealersService: DealersService,
    private readonly dealerImagesService: DealerImagesService,
    private readonly inventoryService: InventoryService,
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
  @Get('mine/inventory')
  async listInventory(
    @CurrentUser() user: User,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.inventoryService.listMine(user),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Post('mine/inventory')
  async createInventory(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createInventoryItemSchema))
    body: CreateInventoryItemInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.inventoryService.create(user, body),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Patch('mine/inventory/:id')
  async updateInventory(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInventoryItemSchema))
    body: UpdateInventoryItemInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.inventoryService.update(user, id, body),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Post('mine/inventory/:id/mark-sold')
  async markInventorySold(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(markSoldSchema)) body: MarkSoldInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.inventoryService.markSold(user, id, body),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('upload')
  @Post('mine/inventory/:id/documents/:type')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadInventoryDocument(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('type', new ZodValidationPipe(inventoryDocumentTypeSchema))
    type: InventoryDocumentType,
    @UploadedFile() file: Express.Multer.File,
    @Body('expiresAt') expiresAt?: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.inventoryService.uploadDocument(
        user,
        id,
        type,
        file,
        expiresAt,
      ),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Delete('mine/inventory/:id/documents/:type')
  async deleteInventoryDocument(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('type', new ZodValidationPipe(inventoryDocumentTypeSchema))
    type: InventoryDocumentType,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.inventoryService.deleteDocument(user, id, type),
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
