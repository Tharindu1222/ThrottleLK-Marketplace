import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config as loadEnv } from 'dotenv';
import { HealthModule } from './health/health.module';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(process.cwd(), '../../.env') });

const skipDb = process.env.SKIP_DB === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ...(skipDb
      ? []
      : [
          TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              type: 'postgres' as const,
              url: config.get<string>('DATABASE_URL'),
              // Phase 0 local only — turn off before production and use migrations.
              synchronize: config.get<string>('NODE_ENV') !== 'production',
              autoLoadEntities: true,
            }),
          }),
        ]),
    HealthModule,
  ],
})
export class AppModule {}
