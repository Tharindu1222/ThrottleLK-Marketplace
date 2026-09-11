import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import {
  adminCreateBrandSchema,
  adminCreateCitySchema,
  adminCreateDistrictSchema,
  adminCreateModelSchema,
  adminResolveReportSchema,
  adminUpdateUserStatusSchema,
  rejectDealerSchema,
  rejectListingSchema,
  type AdminCreateBrandInput,
  type AdminCreateCityInput,
  type AdminCreateDistrictInput,
  type AdminCreateModelInput,
  type AdminResolveReportInput,
  type AdminUpdateUserStatusInput,
  type RejectDealerInput,
} from '@throttlelk/validation';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DealersService } from '../dealers/dealers.service';
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
    private readonly dealersService: DealersService,
    private readonly reportsService: ReportsService,
    private readonly taxonomy: TaxonomyService,
    private readonly users: UsersService,
    private readonly admin: AdminService,
  ) {}

  @Get('dashboard')
  async dashboard(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.admin.dashboard() };
  }

  @Get('listings/pending')
  async pendingListings(): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.listingsService.listPending(),
    };
  }

  @Get('dealers/pending')
  async pendingDealers(): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.dealersService.listPending(),
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
