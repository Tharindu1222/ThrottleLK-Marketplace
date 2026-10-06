import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import {
  createListingPackageSchema,
  updateListingPackageSchema,
  updateListingPostSettingsSchema,
  type CreateListingPackageInput,
  type UpdateListingPackageInput,
  type UpdateListingPostSettingsInput,
} from '@throttlelk/validation';
import { AdminAuditInterceptor } from '../admin/admin-audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ListingPackagesService } from './listing-packages.service';

@Controller('admin/listing-packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@RateLimit('admin')
@UseInterceptors(AdminAuditInterceptor)
export class AdminListingPackagesController {
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

  @Patch('settings')
  async updateSettings(
    @Body(new ZodValidationPipe(updateListingPostSettingsSchema))
    body: UpdateListingPostSettingsInput,
  ): Promise<ApiSuccess<unknown>> {
    const row = await this.packages.updateSettings(body);
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
  async list(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.packages.listAdmin() };
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createListingPackageSchema))
    body: CreateListingPackageInput,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.packages.createPackage(body) };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateListingPackageSchema))
    body: UpdateListingPackageInput,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.packages.updatePackage(id, body) };
  }
}
