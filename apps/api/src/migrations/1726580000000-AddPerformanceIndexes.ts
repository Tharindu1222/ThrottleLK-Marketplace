import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Query-driven indexes for browse, admin, inbox, and dashboard filters.
 * IF NOT EXISTS keeps this safe when synchronize already created the same names.
 */
export class AddPerformanceIndexes1726580000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1726580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_status_published_at" ON "listings" ("status", "published_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_status_brand_id" ON "listings" ("status", "brand_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_status_district_id" ON "listings" ("status", "district_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_status_category_id" ON "listings" ("status", "category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_status_price_lkr" ON "listings" ("status", "price_lkr")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_seller_updated_at" ON "listings" ("seller_id", "updated_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_dealer_id" ON "listings" ("dealer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_model_id" ON "listings" ("model_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_city_id" ON "listings" ("city_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listing_images_listing_sort" ON "listing_images" ("listing_id", "sort_order")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listing_inquiries_listing_id" ON "listing_inquiries" ("listing_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversations_buyer_last_message" ON "conversations" ("buyer_user_id", "last_message_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversations_seller_last_message" ON "conversations" ("seller_user_id", "last_message_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversation_messages_thread" ON "conversation_messages" ("conversation_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_created" ON "notifications" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_favourites_listing_id" ON "favourites" ("listing_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reports_status_created_at" ON "reports" ("status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reports_listing_id" ON "reports" ("listing_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dealers_status_name" ON "dealers" ("status", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dealers_owner_user_id" ON "dealers" ("owner_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cities_district_id" ON "cities" ("district_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_brands_status_name" ON "brands" ("status", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_status_created_at" ON "users" ("status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_saved_searches_user_id" ON "saved_searches" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = [
      'IDX_listings_status_published_at',
      'IDX_listings_status_brand_id',
      'IDX_listings_status_district_id',
      'IDX_listings_status_category_id',
      'IDX_listings_status_price_lkr',
      'IDX_listings_seller_updated_at',
      'IDX_listings_dealer_id',
      'IDX_listings_model_id',
      'IDX_listings_city_id',
      'IDX_listing_images_listing_sort',
      'IDX_listing_inquiries_listing_id',
      'IDX_conversations_buyer_last_message',
      'IDX_conversations_seller_last_message',
      'IDX_conversation_messages_thread',
      'IDX_notifications_user_created',
      'IDX_favourites_listing_id',
      'IDX_reports_status_created_at',
      'IDX_reports_listing_id',
      'IDX_dealers_status_name',
      'IDX_dealers_owner_user_id',
      'IDX_cities_district_id',
      'IDX_brands_status_name',
      'IDX_users_status_created_at',
      'IDX_saved_searches_user_id',
    ];
    for (const name of names) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${name}"`);
    }
  }
}
