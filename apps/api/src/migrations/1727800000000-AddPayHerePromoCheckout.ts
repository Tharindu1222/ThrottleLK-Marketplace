import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PayHere-only promote checkout: nullable bank/slip columns + payment fields.
 */
export class AddPayHerePromoCheckout1727800000000 implements MigrationInterface {
  name = 'AddPayHerePromoCheckout1727800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ALTER COLUMN "bank_account_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ALTER COLUMN "slip_storage_key" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ALTER COLUMN "slip_content_type" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ALTER COLUMN "slip_original_name" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ADD COLUMN IF NOT EXISTS "payment_provider" character varying(20)
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ADD COLUMN IF NOT EXISTS "payhere_order_id" character varying(80)
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ADD COLUMN IF NOT EXISTS "payment_status" character varying(20) NOT NULL DEFAULT 'unpaid'
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ADD COLUMN IF NOT EXISTS "payhere_payment_id" character varying(80)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_promo_requests_payhere_order_id"
      ON "promo_requests" ("payhere_order_id")
      WHERE "payhere_order_id" IS NOT NULL
    `);

    // Existing bank-slip rows stay marked as bank / unpaid until admin approves.
    await queryRunner.query(`
      UPDATE "promo_requests"
      SET "payment_provider" = 'bank'
      WHERE "payment_provider" IS NULL
        AND "bank_account_id" IS NOT NULL
        AND "slip_storage_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_promo_requests_payhere_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_requests" DROP COLUMN IF EXISTS "payhere_payment_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_requests" DROP COLUMN IF EXISTS "paid_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_requests" DROP COLUMN IF EXISTS "payment_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_requests" DROP COLUMN IF EXISTS "payhere_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_requests" DROP COLUMN IF EXISTS "payment_provider"`,
    );

    // Restore NOT NULL only if no nulls remain (legacy bank rows should be fine).
    await queryRunner.query(`
      UPDATE "promo_requests"
      SET
        "slip_storage_key" = COALESCE("slip_storage_key", ''),
        "slip_content_type" = COALESCE("slip_content_type", ''),
        "slip_original_name" = COALESCE("slip_original_name", '')
      WHERE "slip_storage_key" IS NULL
         OR "slip_content_type" IS NULL
         OR "slip_original_name" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ALTER COLUMN "slip_storage_key" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ALTER COLUMN "slip_content_type" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_requests"
      ALTER COLUMN "slip_original_name" SET NOT NULL
    `);
    // bank_account_id may still be null for payhere rows — skip restoring NOT NULL
    // to avoid a failing down migration after payhere data exists.
  }
}
