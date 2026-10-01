import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadPathIndexes1728100000000 implements MigrationInterface {
  name = 'AddReadPathIndexes1728100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_status_view_count" ON "listings" ("status", "view_count")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_status_manufacture_year" ON "listings" ("status", "manufacture_year")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_status_mileage" ON "listings" ("status", "mileage")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_part_listings_status_view_count" ON "part_listings" ("status", "view_count")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_saved_searches_notify" ON "saved_searches" ("id") WHERE "notifications_enabled" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_unread" ON "notifications" ("user_id") WHERE "read_at" IS NULL`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
          EXECUTE 'CREATE INDEX IF NOT EXISTS "IDX_listings_title_trgm" ON "listings" USING gin ("title" gin_trgm_ops)';
          EXECUTE 'CREATE INDEX IF NOT EXISTS "IDX_part_listings_title_trgm" ON "part_listings" USING gin ("title" gin_trgm_ops)';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_part_listings_title_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_title_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_unread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_saved_searches_notify"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_part_listings_status_view_count"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_status_mileage"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_status_manufacture_year"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_status_view_count"`);
  }
}
