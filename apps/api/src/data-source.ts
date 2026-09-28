import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

loadEnv({ path: resolve(__dirname, '../../..', '.env') });
loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '../../.env') });

/**
 * CLI data source for TypeORM (`npm run migration:run` / `migration:revert` in apps/api).
 * Nest also applies pending migrations on boot via `runMigrations()` in `main.ts`.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [resolve(__dirname, '**/*.entity.{ts,js}')],
  migrations: [resolve(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
});
