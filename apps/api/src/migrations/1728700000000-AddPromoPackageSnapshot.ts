import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromoPackageSnapshot1728700000000
  implements MigrationInterface
{
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE promo_requests ADD COLUMN IF NOT EXISTS package_snapshot jsonb`,
    );
    await runner.query(`UPDATE promo_requests r SET package_snapshot = jsonb_build_object(
      'name', p.name, 'durationDays', p.duration_days, 'tier', p.tier, 'surfaces', p.surfaces,
      'priority', p.priority, 'currency', 'LKR') FROM promo_packages p
      WHERE r.package_id = p.id AND r.package_snapshot IS NULL`);
    await runner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_promo_requests_payhere_order"
      ON promo_requests (payhere_order_id) WHERE payhere_order_id IS NOT NULL`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      `DROP INDEX IF EXISTS "UQ_promo_requests_payhere_order"`,
    );
    await runner.query(
      `ALTER TABLE promo_requests DROP COLUMN IF EXISTS package_snapshot`,
    );
  }
}
