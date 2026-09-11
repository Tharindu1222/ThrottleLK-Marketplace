import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { ApiSuccess } from '@throttlelk/types';
import { HealthService } from './health.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async getHealth(): Promise<
    ApiSuccess<{
      status: string;
      service: string;
      database: string;
      sentry: boolean;
    }>
  > {
    const data = await this.health.check();
    return { success: true, data };
  }
}
