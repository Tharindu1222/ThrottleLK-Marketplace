import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartsDealersMarketplace1726900000000
  implements MigrationInterface
{
  name = 'AddPartsDealersMarketplace1726900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name")
      SELECT gen_random_uuid(), 'parts_dealer'
      WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'parts_dealer')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parts_dealers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id"),
        "name" character varying(120) NOT NULL,
        "slug" character varying(140) NOT NULL UNIQUE,
        "description" text,
        "phone" character varying(20) NOT NULL,
        "whatsapp" character varying(20),
        "email" character varying,
        "website" character varying,
        "address" character varying(300),
        "latitude" double precision,
        "longitude" double precision,
        "facebook_url" character varying(500),
        "tiktok_url" character varying(500),
        "district_id" uuid NOT NULL REFERENCES "districts"("id"),
        "city_id" uuid NOT NULL REFERENCES "cities"("id"),
        "status" character varying(40) NOT NULL DEFAULT 'pending',
        "verified_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_parts_dealers_status_name" ON "parts_dealers" ("status", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_parts_dealers_owner_user_id" ON "parts_dealers" ("owner_user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parts_dealer_images" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "parts_dealer_id" uuid NOT NULL REFERENCES "parts_dealers"("id") ON DELETE CASCADE,
        "storage_key" character varying NOT NULL,
        "image_url" character varying NOT NULL,
        "thumbnail_url" character varying,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_cover" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "part_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" character varying(80) NOT NULL,
        "slug" character varying(100) NOT NULL UNIQUE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "part_listings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "parts_dealer_id" uuid NOT NULL REFERENCES "parts_dealers"("id"),
        "kind" character varying(20) NOT NULL,
        "category_id" uuid NOT NULL REFERENCES "part_categories"("id"),
        "title" character varying(160) NOT NULL,
        "slug" character varying(200) NOT NULL UNIQUE,
        "description" text NOT NULL,
        "price_lkr" integer NOT NULL,
        "negotiable" boolean NOT NULL DEFAULT true,
        "condition" character varying(40) NOT NULL,
        "phone" character varying(20),
        "whatsapp" character varying(20),
        "district_id" uuid NOT NULL REFERENCES "districts"("id"),
        "city_id" uuid NOT NULL REFERENCES "cities"("id"),
        "status" character varying(40) NOT NULL DEFAULT 'draft',
        "rejection_reason" text,
        "view_count" integer NOT NULL DEFAULT 0,
        "phone_click_count" integer NOT NULL DEFAULT 0,
        "whatsapp_click_count" integer NOT NULL DEFAULT 0,
        "sold_price_lkr" integer,
        "published_at" TIMESTAMPTZ,
        "sold_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listings_status_published_at" ON "part_listings" ("status", "published_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listings_status_kind" ON "part_listings" ("status", "kind")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listings_status_category_id" ON "part_listings" ("status", "category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listings_status_district_id" ON "part_listings" ("status", "district_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listings_status_price_lkr" ON "part_listings" ("status", "price_lkr")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listings_parts_dealer_id" ON "part_listings" ("parts_dealer_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "part_listing_images" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "part_listing_id" uuid NOT NULL REFERENCES "part_listings"("id") ON DELETE CASCADE,
        "storage_key" character varying NOT NULL,
        "image_url" character varying NOT NULL,
        "thumbnail_url" character varying,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_cover" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listing_images_listing_sort" ON "part_listing_images" ("part_listing_id", "sort_order")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "part_listing_fitments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "part_listing_id" uuid NOT NULL REFERENCES "part_listings"("id") ON DELETE CASCADE,
        "brand_id" uuid NOT NULL REFERENCES "brands"("id"),
        "model_id" uuid REFERENCES "bike_models"("id"),
        UNIQUE ("part_listing_id", "brand_id", "model_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listing_fitments_brand_model" ON "part_listing_fitments" ("brand_id", "model_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listing_fitments_listing_id" ON "part_listing_fitments" ("part_listing_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "part_favourites" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "part_listing_id" uuid NOT NULL REFERENCES "part_listings"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("user_id", "part_listing_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_favourites_listing_id" ON "part_favourites" ("part_listing_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "part_listing_inquiries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "part_listing_id" uuid NOT NULL REFERENCES "part_listings"("id") ON DELETE CASCADE,
        "buyer_name" character varying(120) NOT NULL,
        "buyer_phone" character varying(20) NOT NULL,
        "buyer_email" character varying,
        "message" text NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listing_inquiries_listing_id" ON "part_listing_inquiries" ("part_listing_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "part_listing_engagement_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "part_listing_id" uuid NOT NULL REFERENCES "part_listings"("id") ON DELETE CASCADE,
        "type" character varying(20) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listing_engagement_listing_type_created" ON "part_listing_engagement_events" ("part_listing_id", "type", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listing_engagement_created" ON "part_listing_engagement_events" ("created_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "listing_id" DROP NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "conversations"
      ADD COLUMN IF NOT EXISTS "part_listing_id" uuid
      REFERENCES "part_listings"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "conversations"
      DROP CONSTRAINT IF EXISTS "UQ_conversations_listing_buyer"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "conversations"
        ADD CONSTRAINT "CHK_conversations_subject"
        CHECK (
          ("listing_id" IS NOT NULL AND "part_listing_id" IS NULL)
          OR ("listing_id" IS NULL AND "part_listing_id" IS NOT NULL)
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversations_listing_buyer"
      ON "conversations" ("listing_id", "buyer_user_id")
      WHERE "listing_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversations_part_listing_buyer"
      ON "conversations" ("part_listing_id", "buyer_user_id")
      WHERE "part_listing_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_conversations_part_listing_buyer"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_conversations_listing_buyer"`,
    );
    await queryRunner.query(`
      ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "CHK_conversations_subject"
    `);
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "part_listing_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "listing_id" SET NOT NULL`,
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "part_listing_engagement_events"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "part_listing_inquiries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "part_favourites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "part_listing_fitments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "part_listing_images"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "part_listings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "part_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parts_dealer_images"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parts_dealers"`);
    await queryRunner.query(
      `DELETE FROM "roles" WHERE "name" = 'parts_dealer'`,
    );
  }
}
