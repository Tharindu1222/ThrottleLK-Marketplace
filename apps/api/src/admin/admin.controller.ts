import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { ApiSuccess } from '@throttlelk/types';
import {
  adminCreateBrandSchema,
  adminCreateCitySchema,
  adminCreateDistrictSchema,
  adminCreateDealerSchema,
  adminCreateListingSchema,
  adminCreateModelSchema,
  adminCreateUserSchema,
  adminResolveReportSchema,
  adminUpdateDealerSchema,
  adminUpdateListingSchema,
  adminUpdateUserSchema,
  adminUpdateUserStatusSchema,
  rejectDealerSchema,
  rejectListingSchema,
  type AdminCreateBrandInput,
  type AdminCreateCityInput,
  type AdminCreateDistrictInput,
  type AdminCreateDealerInput,
  type AdminCreateListingInput,
  type AdminCreateModelInput,
  type AdminCreateUserInput,
  type AdminResolveReportInput,
  type AdminUpdateDealerInput,
  type AdminUpdateListingInput,
  type AdminUpdateUserInput,
  type AdminUpdateUserStatusInput,
  type RejectDealerInput,
} from '@throttlelk/validation';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DealerImagesService } from '../dealers/dealer-images.service';
import { DealersService } from '../dealers/dealers.service';
import { ListingImagesService } from '../listings/listing-images.service';
import { ListingsService } from '../listings/listings.service';
import { ReportsService } from '../reports/reports.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { UsersService } from '../users/users.service';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly listingImagesService: ListingImagesService,
    private readonly dealersService: DealersService,
    private readonly dealerImagesService: DealerImagesService,
    private readonly reportsService: ReportsService,
    private readonly taxonomy: TaxonomyService,
    private readonly users: UsersService,
    private readonly admin: AdminService,
  ) {}

  @Get('dashboard')
  async dashboard(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.admin.dashboard() };
  }

  @Get('listings')
  async allListings(
    @Query('status') status?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.listAllAdmin({ status, q }),
    };
  }

  @Get('listings/pending')
  async pendingListings(): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.listPending(),
    };
  }

  @Get('listings/:id')
  async getListing(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.adminGet(id),
    };
  }

  @Post('listings')
  async createListing(
    @Body(new ZodValidationPipe(adminCreateListingSchema))
    body: AdminCreateListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.adminCreate(body),
    };
  }

  @Patch('listings/:id')
  async updateListing(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdateListingSchema))
    body: AdminUpdateListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.adminUpdate(id, body),
    };
  }

  @Delete('listings/:id')
  async deleteListing(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.adminDelete(id),
    };
  }

  @Get('listings/:id/images')
  async listListingImages(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingImagesService.listForListing(id),
    };
  }

  @Post('listings/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadListingImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingImagesService.uploadAsAdmin(id, file),
    };
  }

  @Delete('listings/:id/images/:imageId')
  async deleteListingImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingImagesService.removeAsAdmin(id, imageId),
    };
  }

  @Get('dealers')
  async allDealers(
    @Query('status') status?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.listAllAdmin({ status, q }),
    };
  }

  @Get('dealers/pending')
  async pendingDealers(): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.listPending(),
    };
  }

  @Get('dealers/:id')
  async getDealer(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.adminGet(id),
    };
  }

  @Post('dealers')
  async createDealer(
    @Body(new ZodValidationPipe(adminCreateDealerSchema))
    body: AdminCreateDealerInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.adminCreate(body),
    };
  }

  @Patch('dealers/:id')
  async updateDealer(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdateDealerSchema))
    body: AdminUpdateDealerInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.adminUpdate(id, body),
    };
  }

  @Delete('dealers/:id')
  async deleteDealer(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.adminDelete(id),
    };
  }

  @Get('dealers/:id/images')
  async listDealerImages(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealerImagesService.listForDealer(id),
    };
  }

  @Post('dealers/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadDealerImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealerImagesService.uploadAsAdmin(id, file),
    };
  }

  @Delete('dealers/:id/images/:imageId')
  async deleteDealerImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealerImagesService.removeAsAdmin(id, imageId),
    };
  }

  @Get('reports/open')
  async openReports(): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.reportsService.listOpen(),
    };
  }

  @Post('reports/:id/resolve')
  async resolveReport(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminResolveReportSchema))
    body: AdminResolveReportInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.reportsService.setStatus(id, body.status),
    };
  }

  @Get('users')
  async usersList(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.users.listUsers() };
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: this.users.toPublic(await this.users.findByIdOrThrow(id)),
    };
  }

  @Post('users')
  async createUser(
    @Body(new ZodValidationPipe(adminCreateUserSchema))
    body: AdminCreateUserInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.users.adminCreate(body),
    };
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdateUserSchema))
    body: AdminUpdateUserInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.users.adminUpdate(id, body),
    };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.users.adminDelete(id),
    };
  }

  @Patch('users/:id/status')
  async userStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdateUserStatusSchema))
    body: AdminUpdateUserStatusInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.users.setStatus(id, body.status),
    };
  }

  @Get('brands')
  async brands(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.taxonomy.listBrandsAdmin() };
  }

  @Post('brands')
  async createBrand(
    @Body(new ZodValidationPipe(adminCreateBrandSchema))
    body: AdminCreateBrandInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.taxonomy.adminCreateBrand(body.name),
    };
  }

  @Post('models')
  async createModel(
    @Body(new ZodValidationPipe(adminCreateModelSchema))
    body: AdminCreateModelInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.taxonomy.adminCreateModel(
        body.brandId,
        body.name,
        body.categoryId,
      ),
    };
  }

  @Post('districts')
  async createDistrict(
    @Body(new ZodValidationPipe(adminCreateDistrictSchema))
    body: AdminCreateDistrictInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.taxonomy.adminCreateDistrict(body.name),
    };
  }

  @Post('cities')
  async createCity(
    @Body(new ZodValidationPipe(adminCreateCitySchema))
    body: AdminCreateCityInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.taxonomy.adminCreateCity(body.districtId, body.name),
    };
  }

  @Post('listings/:id/approve')
  async approveListing(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.approve(id),
    };
  }

  @Post('listings/:id/reject')
  async rejectListing(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectListingSchema)) body: { reason: string },
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.reject(id, body.reason),
    };
  }

  @Post('dealers/:id/approve')
  async approveDealer(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.approve(id),
    };
  }

  @Post('dealers/:id/reject')
  async rejectDealer(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectDealerSchema)) body: RejectDealerInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.reject(id, body.reason),
    };
  }
}
