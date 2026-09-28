import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PartListingsService } from './part-listings.service';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class PartListingJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PartListingJobsService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly parts: PartListingsService) {}

  onModuleInit() {
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, HOUR_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async runOnce() {
    try {
      const result = await this.parts.expireStale();
      if (result.expired || result.backfilled) {
        this.logger.log(
          `Part listing expiry: expired=${result.expired} backfilled=${result.backfilled}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Part listing expiry job failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
