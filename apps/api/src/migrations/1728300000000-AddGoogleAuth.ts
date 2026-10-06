import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleAuth1728300000000 implements MigrationInterface {
  name = 'AddGoogleAuth1728300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "password_hash" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "google_sub" character varying(255)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'UQ_users_google_sub'
        ) THEN
          ALTER TABLE "users"
            ADD CONSTRAINT "UQ_users_google_sub" UNIQUE ("google_sub");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_google_sub"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "google_sub"
    `);
    await queryRunner.query(`
      UPDATE "users" SET "password_hash" = '' WHERE "password_hash" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL
    `);
  }
}
