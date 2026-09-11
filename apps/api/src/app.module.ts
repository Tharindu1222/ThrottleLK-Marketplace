import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
        ttl: 60_000,
        limit: 120,
      },
    ]),
    ...(skipDb
      ? []
      : [
          TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              type: 'postgres' as const,
              url: config.get<string>('DATABASE_URL'),
              synchronize: config.get<string>('NODE_ENV') !== 'production',
              autoLoadEntities: true,
            }),
          }),
        ]),
    HealthModule,
    UsersModule,
    AuthModule,
    TaxonomyModule,
    DealersModule,
    ListingsModule,
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
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
