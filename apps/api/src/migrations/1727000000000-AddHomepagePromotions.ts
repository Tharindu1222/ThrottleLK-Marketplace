import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHomepagePromotions1727000000000 implements MigrationInterface {
  name = 'AddHomepagePromotions1727000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promo_packages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "kind" character varying(10) NOT NULL,
        "name" character varying(80) NOT NULL,
        "duration_days" integer NOT NULL,
        "price_lkr" integer NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promo_bank_accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "bank_name" character varying(80) NOT NULL,
        "account_name" character varying(120) NOT NULL,
        "account_number" character varying(40) NOT NULL,
        "branch" character varying(80),
        "is_default" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promo_settings" (
        "id" character varying(20) PRIMARY KEY,
        "whatsapp" character varying(20),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promo_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "seller_id" uuid NOT NULL REFERENCES "users"("id"),
        "subject_type" character varying(10) NOT NULL,
        "listing_id" uuid REFERENCES "listings"("id"),
        "part_listing_id" uuid REFERENCES "part_listings"("id"),
        "package_id" uuid NOT NULL REFERENCES "promo_packages"("id"),
        "bank_account_id" uuid NOT NULL REFERENCES "promo_bank_accounts"("id"),
        "slip_storage_key" character varying(400) NOT NULL,
        "slip_content_type" character varying(80) NOT NULL,
        "slip_original_name" character varying(200) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "rejection_reason" text,
        "reviewed_by_id" uuid REFERENCES "users"("id"),
        "reviewed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_promo_requests_status_created"
      ON "promo_requests" ("status", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_promo_requests_listing_status"
      ON "promo_requests" ("listing_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_promo_requests_part_status"
      ON "promo_requests" ("part_listing_id", "status")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "homepage_placements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid REFERENCES "promo_requests"("id"),
        "source" character varying(20) NOT NULL,
        "subject_type" character varying(10) NOT NULL,
        "listing_id" uuid REFERENCES "listings"("id"),
        "part_listing_id" uuid REFERENCES "part_listings"("id"),
        "starts_at" TIMESTAMPTZ NOT NULL,
        "ends_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_homepage_placements_ends_at"
      ON "homepage_placements" ("ends_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_homepage_placements_listing"
      ON "homepage_placements" ("listing_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_homepage_placements_part"
      ON "homepage_placements" ("part_listing_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "homepage_placements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_bank_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_packages"`);
  }
}
