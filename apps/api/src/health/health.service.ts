import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService implements OnModuleInit {
  private readonly logger = new Logger(HealthService.name);
  private sentryReady = false;

  constructor(
    private readonly config: ConfigService,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  async onModuleInit() {
    const dsn = this.config.get<string>('SENTRY_DSN');
    if (!dsn) return;
    try {
      const Sentry = await import('@sentry/node');
      Sentry.init({
        dsn,
        environment: this.config.get<string>('NODE_ENV') ?? 'development',
        tracesSampleRate: 0.1,
      });
      this.sentryReady = true;
      this.logger.log('Sentry initialized');
    } catch (err) {
      this.logger.warn(
        `Sentry init failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async check() {
    let database: 'up' | 'down' | 'skipped' = 'skipped';
    if (this.dataSource?.isInitialized) {
      try {
        await this.dataSource.query('SELECT 1');
        database = 'up';
      } catch {
        database = 'down';
      }
    } else if (this.config.get<string>('SKIP_DB') === 'true') {
      database = 'skipped';
    } else {
      database = 'down';
    }

    return {
      status: database === 'down' ? 'degraded' : 'ok',
      service: 'throttlelk-api',
      database,
      sentry: this.sentryReady,
    };
  }
}
