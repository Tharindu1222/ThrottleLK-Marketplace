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
  adminCreatePartListingSchema,
  adminCreatePartsDealerSchema,
  adminCreateUserSchema,
  adminResolveReportSchema,
  adminUpdateDealerSchema,
  adminUpdateListingSchema,
  adminUpdatePartListingSchema,
  adminUpdatePartsDealerSchema,
  adminUpdateUserSchema,
  adminUpdateUserStatusSchema,
  createPartCategorySchema,
  rejectDealerSchema,
  rejectListingSchema,
  rejectPartsDealerSchema,
  updatePartCategorySchema,
  type AdminCreateBrandInput,
  type AdminCreateCityInput,
  type AdminCreateDistrictInput,
  type AdminCreateDealerInput,
  type AdminCreateListingInput,
  type AdminCreateModelInput,
  type AdminCreatePartListingInput,
  type AdminCreatePartsDealerInput,
  type AdminCreateUserInput,
  type AdminResolveReportInput,
  type AdminUpdateDealerInput,
  type AdminUpdateListingInput,
  type AdminUpdatePartListingInput,
  type AdminUpdatePartsDealerInput,
  type AdminUpdateUserInput,
  type AdminUpdateUserStatusInput,
  type CreatePartCategoryInput,
  type RejectDealerInput,
  type RejectPartsDealerInput,
  type UpdatePartCategoryInput,
} from '@throttlelk/validation';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DealerImagesService } from '../dealers/dealer-images.service';
import { DealersService } from '../dealers/dealers.service';
import { ListingImagesService } from '../listings/listing-images.service';
import { ListingsService } from '../listings/listings.service';
import { PartCategoriesService } from '../part-listings/part-categories.service';
import { PartListingImagesService } from '../part-listings/part-listing-images.service';
import { PartListingsService } from '../part-listings/part-listings.service';
import { PartsDealerImagesService } from '../parts-dealers/parts-dealer-images.service';
import { PartsDealersService } from '../parts-dealers/parts-dealers.service';
import { ReportsService } from '../reports/reports.service';
import { CategoryCoverService } from '../taxonomy/category-cover.service';
import { BrandLogoService } from '../taxonomy/brand-logo.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { UsersService } from '../users/users.service';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@RateLimit('admin')
export class AdminController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly listingImagesService: ListingImagesService,
    private readonly dealersService: DealersService,
    private readonly dealerImagesService: DealerImagesService,
    private readonly partsDealersService: PartsDealersService,
    private readonly partsDealerImagesService: PartsDealerImagesService,
    private readonly partListingsService: PartListingsService,
    private readonly partListingImagesService: PartListingImagesService,
    private readonly partCategories: PartCategoriesService,
    private readonly reportsService: ReportsService,
    private readonly taxonomy: TaxonomyService,
    private readonly categoryCovers: CategoryCoverService,
    private readonly brandLogos: BrandLogoService,
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.listingsService.listAllAdmin({
      status,
      q,
      page,
      limit,
    });
    return {
      success: true,
      data: items,
      meta,
    };
  }

  @Get('listings/pending')
  async pendingListings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.listingsService.listPending({
      page,
      limit,
      q,
    });
    return { success: true, data: items, meta };
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

  @RateLimit('upload')
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.dealersService.listAllAdmin({
      status,
      q,
      page,
      limit,
    });
    return {
      success: true,
      data: items,
      meta,
    };
  }

  @Get('dealers/pending')
  async pendingDealers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.dealersService.listPending({
      page,
      limit,
      q,
    });
    return { success: true, data: items, meta };
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

  @RateLimit('upload')
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
  async openReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.reportsService.listOpen({
      page,
      limit,
      q,
    });
    return { success: true, data: items, meta };
  }

  @Post('reports/:id/resolve')
  async resolveReport(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminResolveReportSchema))
    body: AdminResolveReportInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.reportsService.resolve(id, body.action, body.note),
    };
  }

  @Get('users')
  async usersList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.users.listUsers({ page, limit, q });
    return { success: true, data: items, meta };
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

  @Get('categories')
  async categories(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.categoryCovers.listPublic() };
  }

  @RateLimit('upload')
  @Post('categories/:id/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadCategoryCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.categoryCovers.uploadCover(id, file),
    };
  }

  @Delete('categories/:id/cover')
  async deleteCategoryCover(
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.categoryCovers.removeCover(id),
    };
  }

  @RateLimit('upload')
  @Post('brands/:id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadBrandLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.brandLogos.uploadLogo(id, file),
    };
  }

  @Delete('brands/:id/logo')
  async deleteBrandLogo(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.brandLogos.removeLogo(id),
    };
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

  @Get('parts-dealers')
  async allPartsDealers(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partsDealersService.listAllAdmin({
      status,
      q,
      page,
      limit,
    });
    return { success: true, data: items, meta };
  }

  @Get('parts-dealers/pending')
  async pendingPartsDealers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partsDealersService.listPending({
      page,
      limit,
      q,
    });
    return { success: true, data: items, meta };
  }

  @Get('parts-dealers/:id')
  async getPartsDealer(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.adminGet(id),
    };
  }

  @Post('parts-dealers')
  async createPartsDealer(
    @Body(new ZodValidationPipe(adminCreatePartsDealerSchema))
    body: AdminCreatePartsDealerInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.adminCreate(body),
    };
  }

  @Patch('parts-dealers/:id')
  async updatePartsDealer(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdatePartsDealerSchema))
    body: AdminUpdatePartsDealerInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.adminUpdate(id, body),
    };
  }

  @Delete('parts-dealers/:id')
  async deletePartsDealer(
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.adminDelete(id),
    };
  }

  @Get('parts-dealers/:id/images')
  async listPartsDealerImages(
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealerImagesService.listForPartsDealer(id),
    };
  }

  @RateLimit('upload')
  @Post('parts-dealers/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPartsDealerImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealerImagesService.uploadAsAdmin(id, file),
    };
  }

  @Delete('parts-dealers/:id/images/:imageId')
  async deletePartsDealerImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealerImagesService.removeAsAdmin(id, imageId),
    };
  }

  @Post('parts-dealers/:id/approve')
  async approvePartsDealer(
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.approve(id),
    };
  }

  @Post('parts-dealers/:id/reject')
  async rejectPartsDealer(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectPartsDealerSchema))
    body: RejectPartsDealerInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partsDealersService.reject(id, body.reason),
    };
  }

  @Get('part-listings')
  async listPartListings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('partsDealerId') partsDealerId?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partListingsService.listAllAdmin({
      page,
      limit,
      q,
      status,
      kind,
      partsDealerId,
    });
    return { success: true, data: items, meta };
  }

  @Get('part-listings/pending')
  async pendingPartListings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partListingsService.listPending({
      page,
      limit,
      q,
    });
    return { success: true, data: items, meta };
  }

  @Get('part-listings/:id')
  async getPartListing(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.adminGet(id),
    };
  }

  @Post('part-listings')
  async createPartListing(
    @Body(new ZodValidationPipe(adminCreatePartListingSchema))
    body: AdminCreatePartListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.adminCreate(body),
    };
  }

  @Patch('part-listings/:id')
  async updatePartListing(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdatePartListingSchema))
    body: AdminUpdatePartListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.adminUpdate(id, body),
    };
  }

  @Delete('part-listings/:id')
  async deletePartListing(
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.adminDelete(id),
    };
  }

  @Post('part-listings/:id/approve')
  async approvePartListing(
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.approve(id),
    };
  }

  @Post('part-listings/:id/reject')
  async rejectPartListing(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectListingSchema)) body: { reason: string },
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.reject(id, body.reason),
    };
  }

  @Get('part-listings/:id/images')
  async listPartListingImages(
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingImagesService.listForListing(id),
    };
  }

  @RateLimit('upload')
  @Post('part-listings/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPartListingImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingImagesService.uploadAsAdmin(id, file),
    };
  }

  @Delete('part-listings/:id/images/:imageId')
  async deletePartListingImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingImagesService.removeAsAdmin(id, imageId),
    };
  }

  @Get('part-categories')
  async listPartCategories(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.partCategories.listPublic() };
  }

  @Post('part-categories')
  async createPartCategory(
    @Body(new ZodValidationPipe(createPartCategorySchema))
    body: CreatePartCategoryInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partCategories.create(body),
    };
  }

  @Patch('part-categories/:id')
  async updatePartCategory(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePartCategorySchema))
    body: UpdatePartCategoryInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partCategories.update(id, body),
    };
  }

  @Delete('part-categories/:id')
  async deletePartCategory(
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partCategories.remove(id),
    };
  }
}
