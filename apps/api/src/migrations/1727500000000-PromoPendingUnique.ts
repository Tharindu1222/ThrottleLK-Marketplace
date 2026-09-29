import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Prevent concurrent pending homepage-ad requests for the same listing.
 * Live placements stay guarded in the service via a transaction + re-check.
 */
export class PromoPendingUnique1727500000000 implements MigrationInterface {
  name = 'PromoPendingUnique1727500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_promo_requests_listing_pending"
      ON "promo_requests" ("listing_id")
      WHERE "status" = 'pending' AND "listing_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_promo_requests_part_pending"
      ON "promo_requests" ("part_listing_id")
      WHERE "status" = 'pending' AND "part_listing_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_promo_requests_listing_pending"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_promo_requests_part_pending"`,
    );
  }
}
