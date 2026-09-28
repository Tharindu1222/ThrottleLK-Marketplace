import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartReportsAndExpiry1727200000000 implements MigrationInterface {
  name = 'AddPartReportsAndExpiry1727200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "part_listings"
      ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_part_listings_status_expires_at"
      ON "part_listings" ("status", "expires_at")
    `);
    await queryRunner.query(`
      ALTER TABLE "reports"
      ALTER COLUMN "listing_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "reports"
      ADD COLUMN IF NOT EXISTS "part_listing_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reports_part_listing_id"
      ON "reports" ("part_listing_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_reports_part_listing_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP COLUMN IF EXISTS "part_listing_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_part_listings_status_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "part_listings" DROP COLUMN IF EXISTS "expires_at"`,
    );
  }
}
