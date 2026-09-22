import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { User } from '../users/user.entity';
import { PartFavouritesService } from './part-favourites.service';

@Controller('part-favourites')
@UseGuards(JwtAuthGuard)
export class PartFavouritesController {
  constructor(private readonly favouritesService: PartFavouritesService) {}

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.favouritesService.listForUser(user.id, {
      page,
      limit,
    });
    return { success: true, data: items, meta };
  }

  @Get('ids')
  async ids(@CurrentUser() user: User): Promise<ApiSuccess<string[]>> {
    return {
      success: true,
      data: await this.favouritesService.idsForUser(user.id),
    };
  }

  @RateLimit('favourite')
  @Post(':partListingId')
  async add(
    @CurrentUser() user: User,
    @Param('partListingId') partListingId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.favouritesService.add(user.id, partListingId),
    };
  }

  @RateLimit('favourite')
  @Delete(':partListingId')
  async remove(
    @CurrentUser() user: User,
    @Param('partListingId') partListingId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.favouritesService.remove(user.id, partListingId),
    };
  }
}
