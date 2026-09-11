import { Controller, Get } from '@nestjs/common';
import type { ApiSuccess } from '@throttlelk/types';

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
