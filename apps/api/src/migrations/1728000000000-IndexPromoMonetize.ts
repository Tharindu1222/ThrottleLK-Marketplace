import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Indexes for the admin monetize aggregates: collected rows by payment
 * status, seller rollups, and live-placement lookups by request.
 */
export class IndexPromoMonetize1728000000000 implements MigrationInterface {
  name = 'IndexPromoMonetize1728000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_promo_requests_payment_status_status_paid_at"
      ON "promo_requests" ("payment_status", "status", "paid_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_promo_requests_seller_id"
      ON "promo_requests" ("seller_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_homepage_placements_request_id"
      ON "homepage_placements" ("request_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_homepage_placements_request_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_promo_requests_seller_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_promo_requests_payment_status_status_paid_at"`,
    );
  }
}
