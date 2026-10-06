import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDealerRejectionReason1728600000000 implements MigrationInterface {
  name = 'AddDealerRejectionReason1728600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dealers"
      ADD COLUMN IF NOT EXISTS "rejection_reason" text
    `);
    await queryRunner.query(`
      ALTER TABLE "parts_dealers"
      ADD COLUMN IF NOT EXISTS "rejection_reason" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "parts_dealers" DROP COLUMN IF EXISTS "rejection_reason"
    `);
    await queryRunner.query(`
      ALTER TABLE "dealers" DROP COLUMN IF EXISTS "rejection_reason"
    `);
  }
}
