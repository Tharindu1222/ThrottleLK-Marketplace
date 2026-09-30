import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lock the package price onto each promo request so later catalog edits
 * do not rewrite collected revenue.
 */
export class AddPromoChargedPrice1727900000000 implements MigrationInterface {
  name = 'AddPromoChargedPrice1727900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ADD COLUMN IF NOT EXISTS "charged_price_lkr" integer
    `);
    await queryRunner.query(`
      UPDATE "promo_requests" AS r
      SET "charged_price_lkr" = p."price_lkr"
      FROM "promo_packages" AS p
      WHERE r."package_id" = p."id"
        AND r."charged_price_lkr" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      DROP COLUMN IF EXISTS "charged_price_lkr"
    `);
  }
}
