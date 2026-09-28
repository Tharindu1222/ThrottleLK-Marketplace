import helmet from 'helmet';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { requireJwtSecrets } from './common/jwt-secrets';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';

async function applyPendingMigrations(app: NestExpressApplication) {
  if (process.env.SKIP_DB === 'true') return;
  const dataSource = app.get(DataSource);
  const applied = await dataSource.runMigrations();
  const logger = new Logger('Migrations');
  if (applied.length === 0) {
    logger.log('Database is up to date');
    return;
  }
  logger.log(
    `Applied ${applied.length} pending migration(s): ${applied
      .map((migration) => migration.name)
      .join(', ')}`,
  );
}

async function bootstrap() {
  requireJwtSecrets(process.env);
  if (
    (process.env.NODE_ENV ?? '') === 'production' &&
    process.env.TRUST_PROXY !== 'true'
  ) {
    throw new Error('TRUST_PROXY=true is required in production');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await applyPendingMigrations(app);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  // ASVS 15.3.4 — honor X-Forwarded-For only behind Cloudflare/nginx.
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
