import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { ApiSuccess } from '@throttlelk/types';

@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  getHealth(): ApiSuccess<{ status: string; service: string }> {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'throttlelk-api',
      },
    };
  }
}
