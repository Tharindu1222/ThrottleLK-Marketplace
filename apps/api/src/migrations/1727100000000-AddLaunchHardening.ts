import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLaunchHardening1727100000000 implements MigrationInterface {
  name = 'AddLaunchHardening1727100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listings"
      ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_status_expires_at"
      ON "listings" ("status", "expires_at")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_user_id" uuid NOT NULL,
        "action" character varying(80) NOT NULL,
        "entity_type" character varying(40) NOT NULL,
        "entity_id" character varying(80),
        "note" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_created_at"
      ON "admin_audit_logs" ("created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_actor"
      ON "admin_audit_logs" ("actor_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_audit_logs"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_listings_status_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "expires_at"`,
    );
  }
}
