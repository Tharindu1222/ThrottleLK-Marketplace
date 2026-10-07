// Run only against a disposable local database: npm run test:integration -w @throttlelk/api.
const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { DataSource, In } = require('typeorm');
const sharp = require('sharp');
const load = (file, name) => require(resolve(__dirname, '../dist', file))[name];
const User = load('users/user.entity', 'User');
const Dealer = load('dealers/dealer.entity', 'Dealer');
const PartsDealer = load('parts-dealers/parts-dealer.entity', 'PartsDealer');
const Listing = load('listings/listing.entity', 'Listing');
const PartListing = load('part-listings/part-listing.entity', 'PartListing');
const ListingImage = load('listings/listing-image.entity', 'ListingImage');
const PartListingImage = load(
  'part-listings/part-listing-image.entity',
  'PartListingImage',
);
const ListingInquiry = load(
  'listings/listing-inquiry.entity',
  'ListingInquiry',
);
const PartListingInquiry = load(
  'part-listings/part-listing-inquiry.entity',
  'PartListingInquiry',
);
const ListingEngagementEvent = load(
  'listings/listing-engagement-event.entity',
  'ListingEngagementEvent',
);
const PartListingEngagementEvent = load(
  'part-listings/part-listing-engagement-event.entity',
  'PartListingEngagementEvent',
);
const PartListingFitment = load(
  'part-listings/part-listing-fitment.entity',
  'PartListingFitment',
);
const PartFavourite = load(
  'part-listings/part-favourite.entity',
  'PartFavourite',
);
const DealerInventoryItem = load(
  'dealers/dealer-inventory-item.entity',
  'DealerInventoryItem',
);
const InventoryDocument = load(
  'dealers/inventory-document.entity',
  'InventoryDocument',
);
const ListingPackage = load(
  'listing-packages/listing-package.entity',
  'ListingPackage',
);
const {
  ListingPostOrder,
  ListingQuota,
} = require('../dist/listing-packages/listing-post-order.entity');
const ListingPostSettings = load(
  'listing-packages/listing-post-settings.entity',
  'ListingPostSettings',
);
const PromoPackage = load('promotions/promo-package.entity', 'PromoPackage');
const PromoRequest = load('promotions/promo-request.entity', 'PromoRequest');
const PromoSettings = load('promotions/promo-settings.entity', 'PromoSettings');
const PromoBankAccount = load(
  'promotions/promo-bank-account.entity',
  'PromoBankAccount',
);
const HomepagePlacement = load(
  'promotions/homepage-placement.entity',
  'HomepagePlacement',
);
const PartCategory = load('part-listings/part-category.entity', 'PartCategory');
const Brand = load('taxonomy/brand.entity', 'Brand');
const BikeModel = load('taxonomy/bike-model.entity', 'BikeModel');
const Category = load('taxonomy/category.entity', 'Category');
const District = load('taxonomy/district.entity', 'District');
const City = load('taxonomy/city.entity', 'City');
const Report = load('reports/report.entity', 'Report');
const Conversation = load('conversations/conversation.entity', 'Conversation');
const ConversationMessage = load(
  'conversations/conversation-message.entity',
  'ConversationMessage',
);
const ListingsService = load('listings/listings.service', 'ListingsService');
const PartListingsService = load(
  'part-listings/part-listings.service',
  'PartListingsService',
);
const ListingImagesService = load(
  'listings/listing-images.service',
  'ListingImagesService',
);
const PartListingImagesService = load(
  'part-listings/part-listing-images.service',
  'PartListingImagesService',
);
const ListingPackagesService = load(
  'listing-packages/listing-packages.service',
  'ListingPackagesService',
);
const PromotionsService = load(
  'promotions/promotions.service',
  'PromotionsService',
);
const InventoryService = load('dealers/inventory.service', 'InventoryService');
const ReportsService = load('reports/reports.service', 'ReportsService');
const ConversationsService = load(
  'conversations/conversations.service',
  'ConversationsService',
);
const PartCategoriesService = load(
  'part-listings/part-categories.service',
  'PartCategoriesService',
);
const CacheService = load('common/cache.service', 'CacheService');
const schema = 'qa_' + randomUUID().replaceAll('-', '');
let db,
  bootstrap,
  seller,
  buyer,
  dealer,
  shop,
  taxonomy,
  bikes,
  parts,
  packages,
  promos,
  inventory;
const cache = new CacheService();
const notifications = new Proxy({}, { get: () => async () => undefined });
const storage = {
  putObject: async (key) => ({
    storageKey: key,
    publicUrl: 'https://example.com/' + key,
  }),
  deleteObject: async () => {},
};
const payhere = {
  requireMerchantId: () => 'qa',
  currency: () => 'LKR',
  verifyNotifyHash: () => true,
  formatAmount: (amount) => Number(amount).toFixed(2),
  normalizePhone: (value) => value,
  webUrl: () => 'https://example.com',
  notifyUrl: () => 'https://example.com/notify',
  checkoutUrl: () => 'https://example.com/checkout',
  buildCheckoutHash: () => 'mock-provider-hash',
};
const repo = (entity) => db.getRepository(entity);
const save = (entity, data) => repo(entity).save(repo(entity).create(data));
before(
  async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url)
      throw new Error(
        'Set TEST_DATABASE_URL to a disposable local throttlelk_qa database',
      );
    const target = new URL(url);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      !target.pathname.startsWith('/throttlelk_qa')
    ) {
      throw new Error(
        'Integration tests require a local database named throttlelk_qa*',
      );
    }
    bootstrap = await new DataSource({ type: 'postgres', url }).initialize();
    await bootstrap.query(`CREATE SCHEMA "${schema}"`);
    db = await new DataSource({
      type: 'postgres',
      url,
      schema,
      uuidExtension: 'pgcrypto',
      entities: [resolve(__dirname, '../dist/**/*.entity.js')],
      migrations: [resolve(__dirname, '../dist/migrations/*.js')],
      synchronize: false,
      extra: { max: 12, options: `-c search_path=${schema},public` },
    }).initialize();
    await db.runMigrations();
    seller = await save(User, {
      email: 'seller@qa.test',
      firstName: 'QA',
      lastName: 'Seller',
      passwordHash: 'test-only',
      emailVerifiedAt: new Date(),
    });
    buyer = await save(User, {
      email: 'buyer@qa.test',
      firstName: 'QA',
      lastName: 'Buyer',
      passwordHash: 'test-only',
      emailVerifiedAt: new Date(),
    });
    const brand = await save(Brand, {
      name: 'QA brand',
      slug: 'qa-brand',
      status: 'active',
    });
    const category = await save(Category, {
      name: 'QA category',
      slug: 'qa-category',
    });
    const district = await save(District, {
      name: 'QA district',
      slug: 'qa-district',
    });
    const city = await save(City, {
      name: 'QA city',
      slug: 'qa-city',
      districtId: district.id,
    });
    const model = await save(BikeModel, {
      name: 'QA model',
      slug: 'qa-model',
      brandId: brand.id,
      categoryId: category.id,
    });
    const partCategory = await save(PartCategory, {
      name: 'QA parts',
      slug: 'qa-parts',
    });
    taxonomy = {
      brandId: brand.id,
      modelId: model.id,
      categoryId: category.id,
      districtId: district.id,
      cityId: city.id,
      partCategoryId: partCategory.id,
    };
    dealer = await save(Dealer, {
      ownerUserId: seller.id,
      name: 'QA dealer',
      slug: 'qa-dealer',
      phone: '0771234567',
      districtId: district.id,
      cityId: city.id,
      status: 'active',
    });
    shop = await save(PartsDealer, {
      ownerUserId: seller.id,
      name: 'QA parts dealer',
      slug: 'qa-parts-dealer',
      phone: '0771234567',
      districtId: district.id,
      cityId: city.id,
      status: 'active',
    });
    const dealers = {
      findActiveOwned: async () => dealer,
      findActiveById: async () => dealer,
      activeVerifiedIds: async () => new Set(),
    };
    const shops = {
      activeVerifiedIds: async () => new Set(),
      assertOwnedActivePartsDealer: async (ownerId, id) => {
        const found = await repo(PartsDealer).findOneBy({
          id,
          ownerUserId: ownerId,
          status: 'active',
        });
        if (!found) throw new Error('No active owned shop');
        return found;
      },
    };
    const users = {
      findByIdOrThrow: (id) => repo(User).findOneByOrFail({ id }),
      findByIds: (ids) => repo(User).findBy({ id: In(ids) }),
      toSellerPublic: (user) => ({ id: user.id, displayName: user.firstName }),
    };
    inventory = new InventoryService(
      repo(DealerInventoryItem),
      repo(InventoryDocument),
      repo(Listing),
      dealers,
      storage,
    );
    bikes = new ListingsService(
      repo(Listing),
      repo(ListingInquiry),
      repo(ListingImage),
      repo(ListingEngagementEvent),
      dealers,
      notifications,
      {
        countsByListingIds: async () => new Map(),
        userIdsForListing: async () => [],
      },
      users,
      cache,
      inventory,
    );
    parts = new PartListingsService(
      repo(PartListing),
      repo(PartListingFitment),
      repo(PartListingInquiry),
      repo(PartListingImage),
      repo(PartListingEngagementEvent),
      repo(PartFavourite),
      repo(Listing),
      repo(Brand),
      repo(BikeModel),
      shops,
      notifications,
      cache,
    );
    packages = new ListingPackagesService(
      repo(ListingPostSettings),
      repo(ListingPackage),
      repo(ListingPostOrder),
      repo(ListingQuota),
      repo(Dealer),
      repo(PartsDealer),
      repo(Listing),
      repo(PartListing),
      payhere,
    );
    promos = new PromotionsService(
      repo(PromoPackage),
      repo(PromoBankAccount),
      repo(PromoSettings),
      repo(PromoRequest),
      repo(HomepagePlacement),
      repo(Listing),
      repo(PartListing),
      bikes,
      parts,
      notifications,
      cache,
      payhere,
      db,
    );
  },
  { timeout: 60000 },
);
after(async () => {
  if (db?.isInitialized) await db.destroy();
  if (bootstrap?.isInitialized) {
    await bootstrap.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await bootstrap.destroy();
  }
});
async function bike(extra = {}) {
  return save(Listing, {
    sellerId: seller.id,
    dealerId: null,
    ...taxonomy,
    title: 'QA bike',
    slug: 'bike-' + randomUUID(),
    description: 'QA listing description for regressions',
    priceLkr: 100000,
    manufactureYear: 2020,
    mileage: 100,
    fuelType: 'petrol',
    transmission: 'manual',
    condition: 'used',
    phone: '0771234567',
    status: 'active',
    publishedAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    ...extra,
  });
}
async function part(extra = {}) {
  return save(PartListing, {
    partsDealerId: shop.id,
    categoryId: taxonomy.partCategoryId,
    districtId: taxonomy.districtId,
    cityId: taxonomy.cityId,
    kind: 'spare',
    title: 'QA brake pads',
    slug: 'part-' + randomUUID(),
    description: 'QA parts description',
    priceLkr: 1000,
    condition: 'new',
    phone: '0771234567',
    status: 'active',
    publishedAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    ...extra,
  });
}
function notify(orderId, code = '2', extra = {}) {
  return {
    merchant_id: 'qa',
    order_id: orderId,
    payhere_amount: '1000.00',
    payhere_currency: 'LKR',
    status_code: code,
    md5sig: 'verified-by-mock',
    ...extra,
  };
}
test('QA-03: all migrations bootstrap an empty schema and rerun without work', async () => {
  assert.ok((await db.showMigrations()) === false);
  assert.deepEqual(await db.runMigrations(), []);
  const countBefore = await repo(User).count();
  await db.query(
    `DELETE FROM migrations WHERE name = 'InitialMarketplace1726500000000'`,
  );
  assert.equal((await db.runMigrations()).length, 1);
  assert.equal(await repo(User).count(), countBefore);
  const runner = db.createQueryRunner();
  try {
    for (const metadata of db.entityMetadatas)
      assert.ok(await runner.hasTable(metadata.tablePath), metadata.tableName);
  } finally {
    await runner.release();
  }
});
test('QA-04: paused/expired material edits cannot resume or renew without review', async () => {
  for (const status of ['paused', 'expired']) {
    const b = await bike({ status });
    assert.equal(
      (await bikes.update(seller, b.id, { title: 'Edited bike' })).status,
      'pending_review',
    );
    await assert.rejects(bikes.resume(seller, b.id));
    await assert.rejects(bikes.renew(seller, b.id));
    const p = await part({ status });
    assert.equal(
      (await parts.update(seller, p.id, { title: 'Edited part' })).status,
      'pending_review',
    );
    await assert.rejects(parts.resume(seller, p.id));
    await assert.rejects(parts.renew(seller, p.id));
  }
});
test('QA-05/11: owner gallery changes require review and sold bikes remain sold', async () => {
  const bytes = await sharp({
    create: { width: 1, height: 1, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  const file = {
    buffer: bytes,
    size: bytes.length,
    mimetype: 'image/png',
    originalname: 'qa.png',
  };
  const partImages = new PartListingImagesService(
    repo(PartListingImage),
    repo(PartListing),
    repo(PartsDealer),
    storage,
    cache,
  );
  const bikeImages = new ListingImagesService(
    repo(ListingImage),
    repo(Listing),
    storage,
    cache,
  );
  for (const status of ['active', 'paused', 'expired']) {
    const p = await part({ status });
    await partImages.upload(seller, p.id, file);
    assert.equal(
      (await repo(PartListing).findOneByOrFail({ id: p.id })).status,
      'pending_review',
    );
  }
  const sold = await bike({ status: 'sold', soldPriceLkr: 100000 });
  await assert.rejects(bikeImages.upload(seller, sold.id, file));
  assert.equal(
    (await repo(Listing).findOneByOrFail({ id: sold.id })).status,
    'sold',
  );
  const live = await part();
  const image = await partImages.uploadAsAdmin(live.id, file);
  assert.equal(
    (await repo(PartListing).findOneByOrFail({ id: live.id })).status,
    'active',
  );
  await partImages.remove(seller, live.id, image.id);
  assert.equal(
    (await repo(PartListing).findOneByOrFail({ id: live.id })).status,
    'pending_review',
  );
});
test('QA-06/07: payment failure rolls back; concurrent purchases and repeated callbacks credit once', async () => {
  const makeOrder = () =>
    save(ListingPostOrder, {
      sellerId: seller.id,
      audience: 'bike',
      packageId: randomUUID(),
      chargedPriceLkr: 1000,
      listingCount: 15,
      payhereOrderId: 'quota-' + randomUUID(),
    });
  const first = await makeOrder();
  await db.query(
    `CREATE FUNCTION qa_fail_quota() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected quota failure'; END $$`,
  );
  await db.query(
    `CREATE TRIGGER qa_fail_quota BEFORE INSERT OR UPDATE ON listing_quotas FOR EACH ROW EXECUTE FUNCTION qa_fail_quota()`,
  );
  await assert.rejects(
    packages.handlePayHereNotify(notify(first.payhereOrderId)),
  );
  assert.equal(
    (await repo(ListingPostOrder).findOneByOrFail({ id: first.id })).status,
    'pending',
  );
  await db.query(`DROP TRIGGER qa_fail_quota ON listing_quotas`);
  const second = await makeOrder();
  await Promise.all([
    packages.handlePayHereNotify(notify(first.payhereOrderId)),
    packages.handlePayHereNotify(notify(second.payhereOrderId)),
    packages.handlePayHereNotify(notify(first.payhereOrderId)),
  ]);
  assert.equal(
    (
      await repo(ListingQuota).findOneByOrFail({
        userId: seller.id,
        audience: 'dealer',
      })
    ).purchased,
    30,
  );
  await Promise.all([
    packages.handlePayHereNotify(notify(first.payhereOrderId, '-3')),
    packages.handlePayHereNotify(notify(first.payhereOrderId, '-3')),
  ]);
  assert.equal(
    (
      await repo(ListingQuota).findOneByOrFail({
        userId: seller.id,
        audience: 'dealer',
      })
    ).purchased,
    15,
  );
});
test('QA-08/09: immutable checkout price/benefits and old callbacks cannot settle replacement orders', async () => {
  const b = await bike();
  const pkg = await save(PromoPackage, {
    kind: 'bike',
    name: 'QA promotion',
    durationDays: 7,
    priceLkr: 1000,
    tier: 'featured',
    surfaces: ['home'],
    priority: 20,
    isActive: true,
  });
  const old = await promos.createCheckout(seller, {
    listingId: b.id,
    packageId: pkg.id,
  });
  const replacement = await promos.createCheckout(seller, {
    listingId: b.id,
    packageId: pkg.id,
  });
  assert.notEqual(old.custom_1, replacement.custom_1);
  await promos.handlePayHereNotify(
    notify(old.order_id, '2', { custom_1: replacement.custom_1 }),
  );
  assert.equal(
    (await repo(PromoRequest).findOneByOrFail({ id: replacement.custom_1 }))
      .paymentStatus,
    'unpaid',
  );
  assert.equal(
    (await repo(PromoRequest).findOneByOrFail({ id: old.custom_1 }))
      .paymentStatus,
    'paid',
  );
  await repo(PromoPackage).update(pkg.id, {
    priceLkr: 2000,
    durationDays: 30,
    tier: 'premium',
  });
  await promos.handlePayHereNotify(notify(replacement.order_id));
  assert.equal(
    (await repo(PromoRequest).findOneByOrFail({ id: replacement.custom_1 }))
      .paymentStatus,
    'paid',
  );
  await promos.approve({ id: seller.id }, replacement.custom_1);
  const placement = await repo(HomepagePlacement).findOneByOrFail({
    requestId: replacement.custom_1,
  });
  assert.equal(placement.tier, 'featured');
  assert.equal(
    placement.endsAt.getTime() - placement.startsAt.getTime(),
    7 * 86400000,
  );
  await promos.handlePayHereNotify(notify(replacement.order_id, '-3'));
  await promos.handlePayHereNotify(notify(replacement.order_id));
  assert.equal(
    (await repo(PromoRequest).findOneByOrFail({ id: replacement.custom_1 }))
      .paymentStatus,
    'chargedback',
  );
});
test('QA-12/13: expired parts and suspended sellers/shops are hidden across public reads', async () => {
  const expired = await part({ expiresAt: new Date(Date.now() - 1000) });
  await assert.rejects(parts.getPublicByIdOrSlug(expired.id));
  await assert.rejects(
    parts.contact(expired.id, {
      buyerName: 'Buyer',
      buyerPhone: '0771234567',
      message: 'Hello',
    }),
  );
  const images = new PartListingImagesService(
    repo(PartListingImage),
    repo(PartListing),
    repo(PartsDealer),
    storage,
    cache,
  );
  await assert.rejects(images.listForListing(expired.id));
  const b = await bike({ dealerId: dealer.id });
  const p = await part();
  assert.ok((await bikes.browseCardsByIds([b.id])).length === 1);
  assert.ok((await parts.browseCardsByIds([p.id])).length === 1);
  await repo(User).update(seller.id, { status: 'suspended' });
  await assert.rejects(bikes.getPublicOrOwned(b.id));
  await assert.rejects(parts.getPublicByIdOrSlug(p.id));
  assert.deepEqual(await bikes.browseCardsByIds([b.id]), []);
  assert.deepEqual(await parts.browseCardsByIds([p.id]), []);
  assert.equal(
    (await bikes.listPublic({ sellerId: seller.id })).items.length,
    0,
  );
  assert.equal(
    (await parts.listPublic({ partsDealerId: shop.id })).items.length,
    0,
  );
  assert.equal((await bikes.listSeoSlugs()).items.length, 0);
  await repo(User).update(seller.id, { status: 'active' });
  await repo(PartsDealer).update(shop.id, { status: 'suspended' });
  await assert.rejects(parts.getPublicByIdOrSlug(p.id));
  await repo(PartsDealer).update(shop.id, { status: 'active' });
  const detail = await bikes.getPublicOrOwned(b.id);
  assert.ok(!JSON.stringify(detail).includes('test-only'));
});
test('QA-14/15: report UUID search and buyer inbox filters execute correctly in PostgreSQL', async () => {
  const a = await bike();
  const b = await bike();
  const p = await part();
  await save(Report, {
    listingId: a.id,
    reason: 'fraud',
    description: 'Reported bike',
  });
  await save(Report, {
    partListingId: p.id,
    reason: 'fraud',
    description: 'Reported part',
  });
  const reports = new ReportsService(
    repo(Report),
    repo(Listing),
    repo(ListingImage),
    repo(PartListing),
    repo(PartListingImage),
    bikes,
    parts,
    notifications,
    cache,
  );
  assert.equal((await reports.listOpen({ q: a.id })).items.length, 1);
  assert.equal((await reports.listOpen({ q: p.id })).items.length, 1);
  const users = { findByIds: (ids) => repo(User).findBy({ id: In(ids) }) };
  const conversations = new ConversationsService(
    repo(Conversation),
    repo(ConversationMessage),
    repo(Listing),
    repo(PartListing),
    notifications,
    users,
  );
  const ca = await save(Conversation, {
    listingId: a.id,
    buyerUserId: buyer.id,
    sellerUserId: seller.id,
    buyerLastReadAt: new Date(Date.now() + 100000),
  });
  const cb = await save(Conversation, {
    listingId: b.id,
    buyerUserId: buyer.id,
    sellerUserId: seller.id,
  });
  await save(ConversationMessage, {
    conversationId: ca.id,
    senderUserId: seller.id,
    body: 'Read',
  });
  await save(ConversationMessage, {
    conversationId: cb.id,
    senderUserId: seller.id,
    body: 'Unread',
  });
  assert.deepEqual(
    (await conversations.listForUser(buyer.id, { listingId: a.id })).items.map(
      (c) => c.id,
    ),
    [ca.id],
  );
  assert.deepEqual(
    (await conversations.listForUser(buyer.id, { unread: '1' })).items.map(
      (c) => c.id,
    ),
    [cb.id],
  );
});
test('QA-16/17: linked inventory follows edits and clearing; mileage zero persists', async () => {
  const b = await bike({
    dealerId: dealer.id,
    costPriceLkr: 1000,
    purchaseDate: '2026-01-01',
    whatsapp: '0771234567',
    colour: 'Black',
    engineCc: 100,
    registrationYear: 2020,
  });
  await inventory.upsertFromListing(b, seller.id);
  await bikes.update(seller, b.id, {
    costPriceLkr: 2000,
    purchaseDate: '2026-02-01',
  });
  let item = await repo(DealerInventoryItem).findOneByOrFail({
    listingId: b.id,
  });
  assert.equal(item.costPriceLkr, 2000);
  assert.equal(item.purchaseDate, '2026-02-01');
  await inventory.update(seller, item.id, {
    costPriceLkr: 3000,
    purchaseDate: null,
  });
  assert.equal(
    (await repo(Listing).findOneByOrFail({ id: b.id })).costPriceLkr,
    3000,
  );
  await bikes.update(seller, b.id, {
    costPriceLkr: null,
    mileage: 0,
    colour: null,
    whatsapp: null,
    engineCc: null,
    registrationYear: null,
  });
  const saved = await repo(Listing).findOneByOrFail({ id: b.id });
  assert.equal(saved.mileage, 0);
  assert.equal(saved.colour, null);
  assert.equal(saved.whatsapp, null);
  item = await repo(DealerInventoryItem).findOneByOrFail({ listingId: b.id });
  assert.equal(item.costPriceLkr, null);
  assert.equal(item.purchaseDate, null);
});
test('QA-19/20: category cycles reject; expiry transaction locks release and concurrent jobs expire once', async () => {
  const categories = new PartCategoriesService(
    repo(PartCategory),
    repo(PartListing),
  );
  const a = await categories.create({ name: 'Parent' });
  const b = await categories.create({ name: 'Child', parentId: a.id });
  await assert.rejects(categories.update(a.id, { parentId: b.id }));
  const c = await categories.create({ name: 'Concurrent C' });
  const d = await categories.create({ name: 'Concurrent D' });
  const outcomes = await Promise.allSettled([
    categories.update(c.id, { parentId: d.id }),
    categories.update(d.id, { parentId: c.id }),
  ]);
  assert.equal(
    outcomes.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  const late = await bike({ expiresAt: new Date(Date.now() - 1000) });
  const jobs = await Promise.all([bikes.expireStale(), bikes.expireStale()]);
  assert.equal(
    jobs.reduce((sum, job) => sum + job.expired, 0),
    1,
  );
  assert.equal(
    (await repo(Listing).findOneByOrFail({ id: late.id })).status,
    'expired',
  );
  const runner = db.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    assert.equal(
      (
        await runner.query('SELECT pg_try_advisory_xact_lock(710001) AS locked')
      )[0].locked,
      true,
    );
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
});
test('QA-21: SEO pagination advances beyond page 200', async () => {
  const result = await bikes.listSeoSlugs({ page: 201, limit: 100 });
  assert.equal(result.meta.page, 201);
  assert.equal(result.items.length, 0);
});
