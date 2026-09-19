import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDealerInventoryAndEngagement1726750000000
  implements MigrationInterface
{
  name = 'AddDealerInventoryAndEngagement1726750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "cost_price_lkr" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "purchase_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "sold_price_lkr" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "phone_click_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "whatsapp_click_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_engagement_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "type" character varying(20) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listing_engagement_listing_type_created"
       ON "listing_engagement_events" ("listing_id", "type", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listing_engagement_created"
       ON "listing_engagement_events" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_listing_engagement_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_listing_engagement_listing_type_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "listing_engagement_events"`);
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "whatsapp_click_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "phone_click_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "sold_price_lkr"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "purchase_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "cost_price_lkr"`,
    );
  }
}
