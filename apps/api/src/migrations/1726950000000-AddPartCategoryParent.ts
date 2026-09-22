import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartCategoryParent1726950000000 implements MigrationInterface {
  name = 'AddPartCategoryParent1726950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "part_categories"
      ALTER COLUMN "slug" TYPE character varying(120)
    `);
    await queryRunner.query(`
      ALTER TABLE "part_categories"
      ADD COLUMN IF NOT EXISTS "parent_id" uuid NULL
      REFERENCES "part_categories"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_part_categories_parent_id"
      ON "part_categories" ("parent_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_part_categories_parent_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "part_categories" DROP COLUMN IF EXISTS "parent_id"
    `);
  }
}
