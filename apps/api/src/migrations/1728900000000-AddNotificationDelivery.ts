import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationDelivery1728900000000
  implements MigrationInterface
{
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE users ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
    await runner.query(`ALTER TABLE notifications
      ADD COLUMN event_key varchar(255),
      ADD COLUMN in_app_enabled boolean NOT NULL DEFAULT true`);
    await runner.query(
      `CREATE UNIQUE INDEX "IDX_notifications_event_key" ON notifications (event_key)`,
    );
    await runner.query(`UPDATE notifications n SET type = 'part_listing_warning',
      data_json = (n.data_json - 'listingId') || jsonb_build_object('partListingId', p.id, 'kind', p.kind)
      FROM part_listings p WHERE n.type = 'listing_warning' AND n.data_json->>'listingId' = p.id::text`);
    await runner.query(`CREATE TABLE notification_emails (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      user_id varchar NOT NULL,
      type varchar(64) NOT NULL,
      recipient text NOT NULL,
      sender text NOT NULL,
      subject text,
      html text,
      status varchar(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','sending','sent','failed','skipped')),
      attempts integer NOT NULL DEFAULT 0,
      available_at timestamptz NOT NULL DEFAULT NOW(),
      locked_until timestamptz,
      lease_token uuid,
      sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )`);
    await runner.query(
      `CREATE UNIQUE INDEX "IDX_notification_emails_notification" ON notification_emails (notification_id)`,
    );
    await runner.query(
      `CREATE INDEX "IDX_notification_emails_due" ON notification_emails (status, available_at)`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE notification_emails`);
    await runner.query(`DROP INDEX "IDX_notifications_event_key"`);
    await runner.query(
      `ALTER TABLE notifications DROP COLUMN event_key, DROP COLUMN in_app_enabled`,
    );
    await runner.query(
      `ALTER TABLE users DROP COLUMN notification_preferences`,
    );
  }
}
