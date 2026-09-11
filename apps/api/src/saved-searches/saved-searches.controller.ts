import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import {
  createSavedSearchSchema,
  updateSavedSearchSchema,
  type CreateSavedSearchInput,
  type UpdateSavedSearchInput,
} from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { SavedSearchesService } from './saved-searches.service';

@Controller('saved-searches')
@UseGuards(JwtAuthGuard)
export class SavedSearchesController {
  constructor(private readonly savedSearchesService: SavedSearchesService) {}

  @Get()
  async list(@CurrentUser() user: User): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.savedSearchesService.list(user.id),
    };
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createSavedSearchSchema))
    body: CreateSavedSearchInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.savedSearchesService.create(user.id, body),
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSavedSearchSchema))
    body: UpdateSavedSearchInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.savedSearchesService.update(user.id, id, body),
    };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.savedSearchesService.remove(user.id, id),
    };
  }
}
