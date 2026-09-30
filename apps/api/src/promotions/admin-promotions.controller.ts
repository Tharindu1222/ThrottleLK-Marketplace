import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import {
  adminPlaceHomepageSchema,
  adminUpdatePlacementSchema,
  createPromoBankAccountSchema,
  createPromoPackageSchema,
  rejectPromoRequestSchema,
  updatePromoBankAccountSchema,
  updatePromoPackageSchema,
  updatePromoSettingsSchema,
  type AdminPlaceHomepageInput,
  type AdminUpdatePlacementInput,
  type CreatePromoBankAccountInput,
  type CreatePromoPackageInput,
  type RejectPromoRequestInput,
  type UpdatePromoBankAccountInput,
  type UpdatePromoPackageInput,
  type UpdatePromoSettingsInput,
} from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import type { MonetizeRange } from './promo-ledger';
import { PromotionsService } from './promotions.service';
import type { PromoSubjectType } from './promo-package.entity';

@Controller('admin/promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@RateLimit('admin')
export class AdminPromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get('packages')
  async packages(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.listPackagesAdmin() };
  }

  @Post('packages')
  async createPackage(
    @Body(new ZodValidationPipe(createPromoPackageSchema))
    body: CreatePromoPackageInput,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.createPackage(body) };
  }

  @Patch('packages/:id')
  async updatePackage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePromoPackageSchema))
    body: UpdatePromoPackageInput,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.updatePackage(id, body) };
  }

  @Get('bank-accounts')
  async banks(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.listBanksAdmin() };
  }

  @Post('bank-accounts')
  async createBank(
    @Body(new ZodValidationPipe(createPromoBankAccountSchema))
    body: CreatePromoBankAccountInput,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.createBank(body) };
  }

  @Patch('bank-accounts/:id')
  async updateBank(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePromoBankAccountSchema))
    body: UpdatePromoBankAccountInput,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.updateBank(id, body) };
  }

  @Get('settings')
  async settings(): Promise<ApiSuccess<unknown>> {
    const info = await this.promotions.paymentInfo();
    return { success: true, data: { whatsapp: info.whatsapp } };
  }

  @Patch('settings')
  async updateSettings(
    @Body(new ZodValidationPipe(updatePromoSettingsSchema))
    body: UpdatePromoSettingsInput,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.updateSettings(body) };
  }

  @Get('monetize')
  async monetize(@Query('range') range?: string): Promise<ApiSuccess<unknown>> {
    const allowed: MonetizeRange =
      range === 'month' || range === '30d' ? range : 'all';
    return { success: true, data: await this.promotions.monetize(allowed) };
  }

  @Get('requests')
  async requests(
    @Query('status') status?: string,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.listRequests(status) };
  }

  @Post('requests/:id/approve')
  async approve(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.approve(user, id) };
  }

  @Post('requests/:id/reject')
  async reject(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectPromoRequestSchema))
    body: RejectPromoRequestInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.promotions.reject(user, id, body.reason),
    };
  }

  @Get('placements')
  async placements(): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.listLivePlacements() };
  }

  @Post('placements')
  async place(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(adminPlaceHomepageSchema))
    body: AdminPlaceHomepageInput,
  ): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.adminPlace(user, body) };
  }

  @Patch('placements/:id')
  async updatePlacement(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdatePlacementSchema))
    body: AdminUpdatePlacementInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.promotions.updatePlacementEnds(id, body.endsAt),
    };
  }

  @Post('placements/:id/end')
  async endPlacement(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return { success: true, data: await this.promotions.endPlacement(id) };
  }

  @Get('search')
  async search(
    @Query('kind') kind?: string,
    @Query('q') q?: string,
  ): Promise<ApiSuccess<unknown>> {
    const k = (kind === 'part' ? 'part' : 'bike') as PromoSubjectType;
    return { success: true, data: await this.promotions.searchSubjects(k, q) };
  }
}
