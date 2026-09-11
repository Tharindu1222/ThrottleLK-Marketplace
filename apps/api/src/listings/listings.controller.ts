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
import { Throttle } from '@nestjs/throttler';
import type { ApiSuccess } from '@throttlelk/types';
import {
  contactListingSchema,
  createListingSchema,
  updateListingSchema,
  type ContactListingInput,
  type CreateListingInput,
  type UpdateListingInput,
} from '@throttlelk/validation';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { ListingImagesService } from './listing-images.service';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly listingImagesService: ListingImagesService,
  ) {}

  @Get()
  async list(
    @Query('brandId') brandId?: string,
    @Query('modelId') modelId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('districtId') districtId?: string,
    @Query('dealerId') dealerId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minYear') minYear?: string,
    @Query('maxYear') maxYear?: string,
    @Query('condition') condition?: string,
    @Query('sort') sort?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.listingsService.listPublic({
      brandId,
      modelId,
      categoryId,
      districtId,
      dealerId,
      sellerId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minYear: minYear ? Number(minYear) : undefined,
      maxYear: maxYear ? Number(maxYear) : undefined,
      condition,
      sort,
      q,
    });
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async mine(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.listMine(user.id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createListingSchema)) body: CreateListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.create(user, body),
    };
  }

  @Get(':id/images')
  async listImages(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingImagesService.listForListing(id),
    };
  }

  @UseGuards(JwtAuthGuard)
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
      data: await this.listingImagesService.upload(user, id, file),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/images/:imageId')
  async deleteImage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingImagesService.remove(user, id, imageId),
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
      data: await this.listingsService.getPublicOrOwned(
        idOrSlug,
        req.user ?? null,
      ),
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/contact')
  async contact(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(contactListingSchema)) body: ContactListingInput,
  ): Promise<ApiSuccess<unknown>> {
    const inquiry = await this.listingsService.createInquiry(id, body);
    return {
      success: true,
      data: { id: inquiry.id, createdAt: inquiry.createdAt },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateListingSchema)) body: UpdateListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.update(user, id, body),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/submit')
  async submit(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.submit(user, id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/pause')
  async pause(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.pause(user, id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/resume')
  async resume(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.resume(user, id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/mark-sold')
  async markSold(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.markSold(user, id),
    };
  }
}
