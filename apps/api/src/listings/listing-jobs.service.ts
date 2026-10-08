import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ListingsService } from './listings.service';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class ListingJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListingJobsService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly listings: ListingsService) {}

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
      const result = await this.listings.expireStale();
      await this.listings.sendExpiringReminders();
      const purged = await this.listings.purgeOldViewEvents();
      if (result.expired || result.backfilled || purged) {
        this.logger.log(
          `Listing expiry: expired=${result.expired} backfilled=${result.backfilled}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Listing expiry job failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
