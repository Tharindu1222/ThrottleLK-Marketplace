import { MigrationInterface, QueryRunner } from 'typeorm';

export class ListingQuotaPackages1728500000000 implements MigrationInterface {
  name = 'ListingQuotaPackages1728500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listing_post_settings"
      RENAME COLUMN "private_free_max_lkr" TO "private_free_listings"
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_post_settings"
      RENAME COLUMN "dealer_free_max_lkr" TO "dealer_free_listings"
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_post_settings"
      RENAME COLUMN "parts_free_max_lkr" TO "parts_free_listings"
    `);
    await queryRunner.query(`
      UPDATE "listing_post_settings"
      SET "private_free_listings" = 5,
          "dealer_free_listings" = 10,
          "parts_free_listings" = 10
      WHERE "id" = 1
    `);

    await queryRunner.query(`
      ALTER TABLE "listing_packages"
      ADD COLUMN IF NOT EXISTS "listing_count" integer
    `);
    await queryRunner.query(`
      UPDATE "listing_packages" SET "listing_count" = 1 WHERE "listing_count" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_packages" ALTER COLUMN "listing_count" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_packages" DROP COLUMN IF EXISTS "duration_days"
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_packages" DROP COLUMN IF EXISTS "max_price_lkr"
    `);

    await queryRunner.query(`
      ALTER TABLE "listing_post_orders"
      ADD COLUMN IF NOT EXISTS "listing_count" integer
    `);
    await queryRunner.query(`
      UPDATE "listing_post_orders"
      SET "listing_count" = 1
      WHERE "listing_count" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_post_orders" ALTER COLUMN "listing_count" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_post_orders" DROP COLUMN IF EXISTS "duration_days"
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_post_orders" DROP COLUMN IF EXISTS "covered_max_lkr"
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_post_orders" DROP COLUMN IF EXISTS "listing_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "listing_post_orders" DROP COLUMN IF EXISTS "part_listing_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "listings"
      DROP COLUMN IF EXISTS "post_audience",
      DROP COLUMN IF EXISTS "post_covered_max_lkr",
      DROP COLUMN IF EXISTS "post_duration_days",
      DROP COLUMN IF EXISTS "post_paid_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "listings"
      ADD COLUMN IF NOT EXISTS "quota_charged" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "part_listings"
      DROP COLUMN IF EXISTS "post_audience",
      DROP COLUMN IF EXISTS "post_covered_max_lkr",
      DROP COLUMN IF EXISTS "post_duration_days",
      DROP COLUMN IF EXISTS "post_paid_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "part_listings"
      ADD COLUMN IF NOT EXISTS "quota_charged" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_quotas" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "audience" character varying(20) NOT NULL,
        "purchased" integer NOT NULL DEFAULT 0,
        "used" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_listing_quotas_user_audience" UNIQUE ("user_id", "audience")
      )
    `);

    const existing = await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM "listing_packages"`,
    );
    if (Number(existing[0]?.count ?? 0) === 0) {
      const seeds = [
        ['bike', '15 listings', 1000, 15, 1],
        ['bike', '40 listings', 2000, 40, 2],
        ['bike', '100 listings', 5000, 100, 3],
        ['parts', '15 listings', 1000, 15, 1],
        ['parts', '40 listings', 2000, 40, 2],
        ['parts', '100 listings', 5000, 100, 3],
      ] as const;
      for (const [audience, name, price, count, sort] of seeds) {
        await queryRunner.query(
          `
          INSERT INTO "listing_packages" (
            "audience", "name", "price_lkr", "listing_count", "sort_order", "is_active"
          ) VALUES ($1, $2, $3, $4, $5, true)
          `,
          [audience, name, price, count, sort],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "listing_quotas"`);
    await queryRunner.query(`
      ALTER TABLE "part_listings" DROP COLUMN IF EXISTS "quota_charged"
    `);
    await queryRunner.query(`
      ALTER TABLE "listings" DROP COLUMN IF EXISTS "quota_charged"
    `);
    await queryRunner.query(`
      DELETE FROM "listing_packages"
      WHERE "name" IN ('15 listings', '40 listings', '100 listings')
    `);
  }
}
