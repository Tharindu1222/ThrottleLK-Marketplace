import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListingPackages1728400000000 implements MigrationInterface {
  name = 'AddListingPackages1728400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_post_settings" (
        "id" integer PRIMARY KEY,
        "private_free_max_lkr" integer NOT NULL DEFAULT 5000,
        "dealer_free_max_lkr" integer NOT NULL DEFAULT 10000,
        "parts_free_max_lkr" integer NOT NULL DEFAULT 10000,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "listing_post_settings" (
        "id", "private_free_max_lkr", "dealer_free_max_lkr", "parts_free_max_lkr"
      ) VALUES (1, 5000, 10000, 10000)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_packages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "audience" character varying(20) NOT NULL,
        "name" character varying(80) NOT NULL,
        "description" character varying(500),
        "price_lkr" integer NOT NULL,
        "duration_days" integer NOT NULL,
        "max_price_lkr" integer,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_post_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "seller_id" uuid NOT NULL,
        "audience" character varying(20) NOT NULL,
        "listing_id" uuid,
        "part_listing_id" uuid,
        "package_id" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "payhere_order_id" character varying(80) NOT NULL,
        "payhere_payment_id" character varying(80),
        "charged_price_lkr" integer NOT NULL,
        "duration_days" integer NOT NULL,
        "covered_max_lkr" integer,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_listing_post_orders_payhere_order_id" UNIQUE ("payhere_order_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listing_post_orders_listing_id"
      ON "listing_post_orders" ("listing_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listing_post_orders_part_listing_id"
      ON "listing_post_orders" ("part_listing_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "listings"
      ADD COLUMN IF NOT EXISTS "post_paid_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "post_duration_days" integer,
      ADD COLUMN IF NOT EXISTS "post_covered_max_lkr" integer,
      ADD COLUMN IF NOT EXISTS "post_audience" character varying(20)
    `);
    await queryRunner.query(`
      ALTER TABLE "part_listings"
      ADD COLUMN IF NOT EXISTS "post_paid_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "post_duration_days" integer,
      ADD COLUMN IF NOT EXISTS "post_covered_max_lkr" integer,
      ADD COLUMN IF NOT EXISTS "post_audience" character varying(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "part_listings"
      DROP COLUMN IF EXISTS "post_audience",
      DROP COLUMN IF EXISTS "post_covered_max_lkr",
      DROP COLUMN IF EXISTS "post_duration_days",
      DROP COLUMN IF EXISTS "post_paid_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "listings"
      DROP COLUMN IF EXISTS "post_audience",
      DROP COLUMN IF EXISTS "post_covered_max_lkr",
      DROP COLUMN IF EXISTS "post_duration_days",
      DROP COLUMN IF EXISTS "post_paid_at"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "listing_post_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "listing_packages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "listing_post_settings"`);
  }
}
