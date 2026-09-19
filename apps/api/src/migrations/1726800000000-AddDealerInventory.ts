import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDealerInventory1726800000000 implements MigrationInterface {
  name = 'AddDealerInventory1726800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dealer_inventory_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "dealer_id" uuid NOT NULL REFERENCES "dealers"("id") ON DELETE CASCADE,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" character varying(160) NOT NULL,
        "brand_name" character varying(80),
        "model_name" character varying(80),
        "manufacture_year" integer,
        "purchase_date" date,
        "cost_price_lkr" integer,
        "asking_price_lkr" integer,
        "sold_price_lkr" integer,
        "sold_at" TIMESTAMPTZ,
        "listing_id" uuid REFERENCES "listings"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dealer_inventory_dealer_id" ON "dealer_inventory_items" ("dealer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dealer_inventory_owner_user_id" ON "dealer_inventory_items" ("owner_user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_dealer_inventory_listing_id" ON "dealer_inventory_items" ("listing_id") WHERE "listing_id" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "inventory_item_id" uuid NOT NULL REFERENCES "dealer_inventory_items"("id") ON DELETE CASCADE,
        "type" character varying(40) NOT NULL,
        "file_url" character varying(500) NOT NULL,
        "storage_key" character varying(300) NOT NULL,
        "file_name" character varying(200) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "expires_at" date,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("inventory_item_id", "type")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inventory_documents_item_id" ON "inventory_documents" ("inventory_item_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inventory_documents_item_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_documents"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_dealer_inventory_listing_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_dealer_inventory_owner_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_dealer_inventory_dealer_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dealer_inventory_items"`);
  }
}
