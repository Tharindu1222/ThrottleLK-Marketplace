import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';
import {
  createReportSchema,
  type CreateReportInput,
} from '@throttlelk/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User } from '../users/user.entity';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @RateLimit('report')
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createReportSchema)) body: CreateReportInput,
  ): Promise<ApiSuccess<unknown>> {
    const report = await this.reportsService.create(user.id, body);
    return {
      success: true,
      data: {
        id: report.id,
        status: report.status,
        createdAt: report.createdAt,
      },
    };
  }
}
