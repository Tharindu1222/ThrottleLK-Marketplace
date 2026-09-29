import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persist cover-image focal points (0–100) for dealer and parts-dealer showrooms.
 */
export class AddDealerCoverFocus1727600000000 implements MigrationInterface {
  name = 'AddDealerCoverFocus1727600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dealers"
      ADD COLUMN IF NOT EXISTS "cover_focus_x" double precision NOT NULL DEFAULT 50
    `);
    await queryRunner.query(`
      ALTER TABLE "dealers"
      ADD COLUMN IF NOT EXISTS "cover_focus_y" double precision NOT NULL DEFAULT 50
    `);
    await queryRunner.query(`
      ALTER TABLE "parts_dealers"
      ADD COLUMN IF NOT EXISTS "cover_focus_x" double precision NOT NULL DEFAULT 50
    `);
    await queryRunner.query(`
      ALTER TABLE "parts_dealers"
      ADD COLUMN IF NOT EXISTS "cover_focus_y" double precision NOT NULL DEFAULT 50
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parts_dealers" DROP COLUMN IF EXISTS "cover_focus_y"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts_dealers" DROP COLUMN IF EXISTS "cover_focus_x"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dealers" DROP COLUMN IF EXISTS "cover_focus_y"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dealers" DROP COLUMN IF EXISTS "cover_focus_x"`,
    );
  }
}
