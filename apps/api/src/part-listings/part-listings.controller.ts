import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { ApiSuccess } from '@throttlelk/types';
import {
  contactClickSchema,
  contactListingSchema,
  createPartListingSchema,
  markSoldSchema,
  updatePartListingSchema,
  type ContactClickInput,
  type ContactListingInput,
  type CreatePartListingInput,
  type MarkSoldInput,
  type UpdatePartListingInput,
} from '@throttlelk/validation';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { PartCategoriesService } from './part-categories.service';
import { PartListingImagesService } from './part-listing-images.service';
import { PartListingsService } from './part-listings.service';

@Controller('part-listings')
export class PartListingsController {
  constructor(
    private readonly partListingsService: PartListingsService,
    private readonly partListingImagesService: PartListingImagesService,
    private readonly partCategories: PartCategoriesService,
  ) {}

  @Get('categories')
  async categories(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.partCategories.listPublic() };
  }

  @Get()
  async list(
    @Query('kind') kind?: string,
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
      kind,
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

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async mine(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partListingsService.listMine(user.id, {
      page,
      limit,
    });
    return { success: true, data: items, meta };
  }

  @Get('seo-slugs')
  async seoSlugs(
    @Query('kind') kind?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partListingsService.listSeoSlugs(kind, {
      page,
      limit,
    });
    return { success: true, data: items, meta };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createPartListingSchema))
    body: CreatePartListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.create(user, body),
    };
  }

  @Get(':id/images')
  async listImages(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingImagesService.listForListing(id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('upload')
  @Post(':id/images')
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
      data: await this.partListingImagesService.upload(user, id, file),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Delete(':id/images/:imageId')
  async deleteImage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingImagesService.remove(user, id, imageId),
    };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':idOrSlug')
  async getOne(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req: Request & { user?: User },
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.getPublicByIdOrSlug(
        idOrSlug,
        req.user ?? null,
      ),
    };
  }

  @RateLimit('contact')
  @Post(':id/contact')
  async contact(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(contactListingSchema)) body: ContactListingInput,
  ): Promise<ApiSuccess<unknown>> {
    const inquiry = await this.partListingsService.contact(id, body);
    return {
      success: true,
      data: { id: inquiry.id, createdAt: inquiry.createdAt },
    };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @RateLimit('views')
  @Post(':id/views')
  async recordView(
    @Param('id') id: string,
    @Req() req: Request & { user?: User },
  ): Promise<ApiSuccess<{ recorded: boolean }>> {
    return {
      success: true,
      data: await this.partListingsService.recordView(id, req.user ?? null),
    };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @RateLimit('views')
  @Post(':id/contact-clicks')
  async recordContactClick(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(contactClickSchema)) body: ContactClickInput,
    @Req() req: Request & { user?: User },
  ): Promise<ApiSuccess<{ recorded: boolean }>> {
    return {
      success: true,
      data: await this.partListingsService.recordContactClick(
        id,
        body.type,
        req.user ?? null,
      ),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePartListingSchema))
    body: UpdatePartListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.update(user, id, body),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Post(':id/submit')
  async submit(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.submit(user, id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Post(':id/pause')
  async pause(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.pause(user, id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Post(':id/resume')
  async resume(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.resume(user, id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @RateLimit('write')
  @Post(':id/mark-sold')
  async markSold(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(markSoldSchema)) body: MarkSoldInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.markSold(user, id, body),
    };
  }
}
