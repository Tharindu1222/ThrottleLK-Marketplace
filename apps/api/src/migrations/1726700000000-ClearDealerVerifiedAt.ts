import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Clear auto-set verified_at so verification is admin-only going forward.
 */
export class ClearDealerVerifiedAt1726700000000 implements MigrationInterface {
  name = 'ClearDealerVerifiedAt1726700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "dealers" SET "verified_at" = NULL`);
  }

  public async down(): Promise<void> {
    // Irreversible: previous verified timestamps are not restored.
  }
}
