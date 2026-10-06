import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class AdminAuditJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminAuditJobsService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly audit: AdminAuditService) {}

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
      const purged = await this.audit.purgeOlderThan();
      if (purged) {
        this.logger.log(`Audit retention: removed ${purged} row(s) older than 90 days`);
      }
    } catch (error) {
      this.logger.warn(
        `Audit retention job failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
