import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListingRegistrationStatus1728800000000
  implements MigrationInterface
{
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE listings ADD COLUMN registration_status varchar(20)
      CHECK (registration_status IN ('registered', 'unregistered'))`);
    await runner.query(`UPDATE listings SET registration_status = 'registered'
      WHERE registration_year IS NOT NULL`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE listings DROP COLUMN registration_status`);
  }
}
