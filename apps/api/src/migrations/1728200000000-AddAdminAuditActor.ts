import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAuditActor1728200000000 implements MigrationInterface {
  name = 'AddAdminAuditActor1728200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_audit_logs"
      ADD COLUMN IF NOT EXISTS "actor_name" character varying(160)
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_audit_logs"
      ADD COLUMN IF NOT EXISTS "actor_email" character varying(255)
    `);
    // This table was created as varchar on databases that existed before the
    // uuid definition in AddLaunchHardening (CREATE TABLE IF NOT EXISTS).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'admin_audit_logs'
            AND column_name = 'actor_user_id'
            AND udt_name <> 'uuid'
        ) THEN
          ALTER TABLE "admin_audit_logs"
            ALTER COLUMN "actor_user_id" TYPE uuid
            USING "actor_user_id"::uuid;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      UPDATE "admin_audit_logs" AS log
      SET
        "actor_name" = NULLIF(BTRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
        "actor_email" = u.email
      FROM "users" u
      WHERE u.id = log.actor_user_id
        AND log.actor_name IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_audit_logs" DROP COLUMN IF EXISTS "actor_email"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_audit_logs" DROP COLUMN IF EXISTS "actor_name"
    `);
  }
}
