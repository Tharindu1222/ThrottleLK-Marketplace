import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add tier / surfaces / priority to promo packages and placement snapshots.
 * Backfill existing rows as Featured; seed Boost/Featured/Premium per kind if missing.
 */
export class AddPromoTiers1727700000000 implements MigrationInterface {
  name = 'AddPromoTiers1727700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "promo_packages"
      ADD COLUMN IF NOT EXISTS "tier" character varying(20) NOT NULL DEFAULT 'featured'
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_packages"
      ADD COLUMN IF NOT EXISTS "surfaces" jsonb NOT NULL DEFAULT '["home","browse","detail"]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "promo_packages"
      ADD COLUMN IF NOT EXISTS "priority" integer NOT NULL DEFAULT 20
    `);

    await queryRunner.query(`
      ALTER TABLE "homepage_placements"
      ADD COLUMN IF NOT EXISTS "tier" character varying(20) NOT NULL DEFAULT 'featured'
    `);
    await queryRunner.query(`
      ALTER TABLE "homepage_placements"
      ADD COLUMN IF NOT EXISTS "surfaces" jsonb NOT NULL DEFAULT '["home","browse","detail"]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "homepage_placements"
      ADD COLUMN IF NOT EXISTS "priority" integer NOT NULL DEFAULT 20
    `);

    await queryRunner.query(`
      UPDATE "promo_packages"
      SET
        "tier" = 'featured',
        "surfaces" = '["home","browse","detail"]'::jsonb,
        "priority" = 20
      WHERE "tier" IS NULL
         OR "surfaces" IS NULL
         OR "priority" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "homepage_placements"
      SET
        "tier" = 'featured',
        "surfaces" = '["home","browse","detail"]'::jsonb,
        "priority" = 20
      WHERE "tier" IS NULL
         OR "surfaces" IS NULL
         OR "priority" IS NULL
    `);

    // Idempotent seed: bike + part × boost / featured / premium when that tier is missing.
    const seeds: Array<{
      kind: string;
      tier: string;
      name: string;
      durationDays: number;
      priceLkr: number;
      surfaces: string;
      priority: number;
      sortOrder: number;
    }> = [
      {
        kind: 'bike',
        tier: 'boost',
        name: 'Boost',
        durationDays: 7,
        priceLkr: 500,
        surfaces: '["browse","detail"]',
        priority: 10,
        sortOrder: 10,
      },
      {
        kind: 'bike',
        tier: 'featured',
        name: 'Featured',
        durationDays: 7,
        priceLkr: 1000,
        surfaces: '["home","browse","detail"]',
        priority: 20,
        sortOrder: 20,
      },
      {
        kind: 'bike',
        tier: 'premium',
        name: 'Premium',
        durationDays: 14,
        priceLkr: 2000,
        surfaces: '["home","browse","detail"]',
        priority: 30,
        sortOrder: 30,
      },
      {
        kind: 'part',
        tier: 'boost',
        name: 'Boost',
        durationDays: 7,
        priceLkr: 500,
        surfaces: '["browse","detail"]',
        priority: 10,
        sortOrder: 10,
      },
      {
        kind: 'part',
        tier: 'featured',
        name: 'Featured',
        durationDays: 7,
        priceLkr: 1000,
        surfaces: '["home","browse","detail"]',
        priority: 20,
        sortOrder: 20,
      },
      {
        kind: 'part',
        tier: 'premium',
        name: 'Premium',
        durationDays: 14,
        priceLkr: 2000,
        surfaces: '["home","browse","detail"]',
        priority: 30,
        sortOrder: 30,
      },
    ];

    for (const seed of seeds) {
      await queryRunner.query(
        `
        INSERT INTO "promo_packages" (
          "kind", "name", "duration_days", "price_lkr",
          "tier", "surfaces", "priority", "sort_order", "is_active"
        )
        SELECT
          $1::varchar, $2::varchar, $3::int, $4::int,
          $5::varchar, $6::jsonb, $7::int, $8::int, true
        WHERE NOT EXISTS (
          SELECT 1 FROM "promo_packages"
          WHERE "kind" = $1::varchar AND "tier" = $5::varchar
        )
        `,
        [
          seed.kind,
          seed.name,
          seed.durationDays,
          seed.priceLkr,
          seed.tier,
          seed.surfaces,
          seed.priority,
          seed.sortOrder,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "homepage_placements" DROP COLUMN IF EXISTS "priority"`,
    );
    await queryRunner.query(
      `ALTER TABLE "homepage_placements" DROP COLUMN IF EXISTS "surfaces"`,
    );
    await queryRunner.query(
      `ALTER TABLE "homepage_placements" DROP COLUMN IF EXISTS "tier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_packages" DROP COLUMN IF EXISTS "priority"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_packages" DROP COLUMN IF EXISTS "surfaces"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_packages" DROP COLUMN IF EXISTS "tier"`,
    );
  }
}
