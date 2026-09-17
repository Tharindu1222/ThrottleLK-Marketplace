import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  INTERNAL_RATE_LIMIT_HEADER,
  clientIp,
  isInternalApiRequest,
} from './rate-limit';

/** ASVS 15.3.4 — throttle on the real client IP when behind a trusted proxy. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    return isInternalApiRequest(req.headers[INTERNAL_RATE_LIMIT_HEADER]);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    return clientIp(req as Parameters<typeof clientIp>[0]);
  }
}
