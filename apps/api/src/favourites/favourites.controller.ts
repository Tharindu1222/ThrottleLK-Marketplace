import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { User } from '../users/user.entity';
import { FavouritesService } from './favourites.service';

@Controller('favourites')
@UseGuards(JwtAuthGuard)
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Get()
  async list(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.favouritesService.listForUser(user.id),
    };
  }

  @Get('ids')
  async ids(@CurrentUser() user: User): Promise<ApiSuccess<string[]>> {
    return {
      success: true,
      data: await this.favouritesService.idsForUser(user.id),
    };
  }

  @RateLimit('favourite')
  @Post(':listingId')
  async add(
    @CurrentUser() user: User,
    @Param('listingId') listingId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.favouritesService.add(user.id, listingId),
    };
  }

  @RateLimit('favourite')
  @Delete(':listingId')
  async remove(
    @CurrentUser() user: User,
    @Param('listingId') listingId: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.favouritesService.remove(user.id, listingId),
    };
  }
}
