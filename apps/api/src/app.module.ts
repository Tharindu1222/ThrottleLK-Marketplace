import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/app-throttler.guard';
import { CacheModule } from './common/cache.module';
import { RATE_LIMITS } from './common/rate-limit';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config as loadEnv } from 'dotenv';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DealersModule } from './dealers/dealers.module';
import { FavouritesModule } from './favourites/favourites.module';
import { HealthModule } from './health/health.module';
import { ListingsModule } from './listings/listings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PartListingsModule } from './part-listings/part-listings.module';
import { PartsDealersModule } from './parts-dealers/parts-dealers.module';
import { ReportsModule } from './reports/reports.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { SeedModule } from './seed/seed.module';
import { StorageModule } from './storage/storage.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { UsersModule } from './users/users.module';

/** Monorepo root `.env` (works from `src` or compiled `dist`). */
const rootEnvPath = resolve(__dirname, '../../..', '.env');
loadEnv({ path: rootEnvPath });
loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '../../.env') });

const skipDb = process.env.SKIP_DB === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        rootEnvPath,
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
      ],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: RATE_LIMITS.default.ttl,
        limit: RATE_LIMITS.default.limit,
      },
    ]),
    ...(skipDb
      ? []
      : [
          TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
              const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
              const slowMs = Number(
                config.get<string>('SLOW_QUERY_MS') ??
                  (nodeEnv === 'production' ? 1000 : 500),
              );
              const poolMax = Number(config.get<string>('DB_POOL_MAX') ?? 10);
              return {
                type: 'postgres' as const,
                url: config.get<string>('DATABASE_URL'),
                synchronize: nodeEnv !== 'production',
                autoLoadEntities: true,
                maxQueryExecutionTime: Number.isFinite(slowMs) ? slowMs : 1000,
                extra: {
                  max: Number.isFinite(poolMax) ? poolMax : 10,
                  idleTimeoutMillis: 30_000,
                  connectionTimeoutMillis: 10_000,
                },
              };
            },
          }),
        ]),
    HealthModule,
    CacheModule,
    UsersModule,
    AuthModule,
    TaxonomyModule,
    DealersModule,
    PartsDealersModule,
    ListingsModule,
    PartListingsModule,
    FavouritesModule,
    SavedSearchesModule,
    ReportsModule,
    ConversationsModule,
    NotificationsModule,
    StorageModule,
    AdminModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
