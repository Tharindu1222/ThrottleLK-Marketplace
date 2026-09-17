import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

loadEnv({ path: resolve(__dirname, '../../..', '.env') });
loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '../../.env') });

/**
 * CLI data source for TypeORM migrations (`npm run migration:run` in apps/api).
 * Runtime Nest still uses TypeOrmModule.forRootAsync — this file is not the app connection.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [resolve(__dirname, '**/*.entity.{ts,js}')],
  migrations: [resolve(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
});
