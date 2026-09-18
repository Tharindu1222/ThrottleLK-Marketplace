import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDealerProfileGeoSocial1726650000000
  implements MigrationInterface
{
  name = 'AddDealerProfileGeoSocial1726650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "latitude" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "longitude" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "facebook_url" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "tiktok_url" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dealers" DROP COLUMN IF EXISTS "tiktok_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dealers" DROP COLUMN IF EXISTS "facebook_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dealers" DROP COLUMN IF EXISTS "longitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dealers" DROP COLUMN IF EXISTS "latitude"`,
    );
  }
}
