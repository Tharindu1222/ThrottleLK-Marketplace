import { Controller, Get, Param } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import { UsersService } from '../users/users.service';

@Controller('sellers')
export class SellersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.usersService.getSellerPublic(id),
    };
  }
}
