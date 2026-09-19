# Dealer Performance & Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give dealers a Performance page (active listings, views, phone/WA clicks, favourites with all/7d/30d ranges) and private inventory fields (cost, purchase date, sold price, days in stock, margin) without exposing them to buyers.

**Architecture:** Add inventory + lifetime click counters on `listings`; append `listing_engagement_events` for ranged views/phone/whatsapp; aggregate favourites from existing `favourites.created_at`. Owner-only DTOs and a dealer-gated Performance API; web wires contact clicks, sold dialog, inventory forms, and `/account/performance`.

**Tech Stack:** NestJS + TypeORM (Postgres), Zod (`@throttlelk/validation`), Jest, Next.js App Router, existing account shell / `ListingCard` / rate-limit patterns.

## Global Constraints

- Dealers only — private sellers unchanged (no Performance nav, ignore inventory fields on create/update).
- Public browse/detail DTOs never include `costPriceLkr`, `purchaseDate`, `soldPriceLkr`, click counters, margin, or `favouriteCount` (owner paths may).
- Mark sold requires `soldPriceLkr`; `soldAt` optional (default now).
- Cost / purchase date optional; margin only when cost + sold (or potential vs asking when unsold + cost).
- `activeListings` on Performance is always current; views/clicks/favourites respect `range=all|7d|30d`.
- Views stay filterable via engagement events (keep incrementing `viewCount`).
- Shop-level showroom Call/WA click attribution is out of scope; listing detail only.
- No charts, CSV, or per-listing performance table in v1.

## File structure

| File | Responsibility |
|------|----------------|
| `apps/api/src/migrations/1726750000000-AddDealerInventoryAndEngagement.ts` | Columns + `listing_engagement_events` table |
| `apps/api/src/listings/listing.entity.ts` | Inventory + click counter columns |
| `apps/api/src/listings/listing-engagement-event.entity.ts` | Engagement event rows |
| `packages/validation/src/index.ts` | Inventory fields, `markSoldSchema`, `contactClickSchema`, `performanceRangeSchema` |
| `apps/api/src/listings/listings.service.ts` | Events, contact clicks, mark-sold body, owner fields, days/margin helpers |
| `apps/api/src/listings/listings.controller.ts` | `POST :id/contact-clicks`; mark-sold body |
| `apps/api/src/listings/listings.module.ts` | Register engagement entity |
| `apps/api/src/dealers/dealers.service.ts` | `performance(ownerUserId, range)` |
| `apps/api/src/dealers/dealers.controller.ts` | `GET mine/performance` |
| `apps/web/src/components/listing-actions.tsx` | Fire contact-click before tel/wa |
| `apps/web/src/app/[locale]/account/listings/my-listings-client.tsx` | Sold dialog; owner metrics on cards |
| `apps/web/src/app/[locale]/sell/sell-form.tsx` | Optional cost / purchase date when dealer |
| `apps/web/src/app/[locale]/account/listings/[id]/edit/edit-listing-form.tsx` | Same inventory fields |
| `apps/web/src/app/[locale]/account/performance/page.tsx` | Server wrapper |
| `apps/web/src/app/[locale]/account/performance/performance-client.tsx` | Metrics UI + range tabs |
| `apps/web/src/components/account-sidebar.tsx` | Performance nav (`dealerOnly`) |
| `apps/web/src/lib/i18n.ts` | en + si strings |
| Specs under `apps/api/src/**/*.spec.ts` | Unit coverage for new behavior |

---

### Task 1: Migration + entities

**Files:**
- Create: `apps/api/src/migrations/1726750000000-AddDealerInventoryAndEngagement.ts`
- Create: `apps/api/src/listings/listing-engagement-event.entity.ts`
- Modify: `apps/api/src/listings/listing.entity.ts`
- Modify: `apps/api/src/listings/listings.module.ts` — `TypeOrmModule.forFeature([..., ListingEngagementEvent])`

**Interfaces:**
- Produces: `Listing.costPriceLkr: number | null`, `purchaseDate: string | Date | null`, `soldPriceLkr: number | null`, `phoneClickCount: number`, `whatsappClickCount: number`
- Produces: entity `ListingEngagementEvent` mapped to `listing_engagement_events` with `type: 'view' | 'phone' | 'whatsapp'`

- [ ] **Step 1: Write migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDealerInventoryAndEngagement1726750000000
  implements MigrationInterface
{
  name = 'AddDealerInventoryAndEngagement1726750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "cost_price_lkr" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "purchase_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "sold_price_lkr" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "phone_click_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "whatsapp_click_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_engagement_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "type" character varying(20) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listing_engagement_listing_type_created"
       ON "listing_engagement_events" ("listing_id", "type", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listing_engagement_created"
       ON "listing_engagement_events" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_listing_engagement_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_listing_engagement_listing_type_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "listing_engagement_events"`);
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "whatsapp_click_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "phone_click_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "sold_price_lkr"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "purchase_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "cost_price_lkr"`,
    );
  }
}
```

- [ ] **Step 2: Add entity columns on `Listing`** (after `viewCount`):

```typescript
@Column({ name: 'cost_price_lkr', type: 'int', nullable: true })
costPriceLkr!: number | null;

@Column({ name: 'purchase_date', type: 'date', nullable: true })
purchaseDate!: string | null;

@Column({ name: 'sold_price_lkr', type: 'int', nullable: true })
soldPriceLkr!: number | null;

@Column({ name: 'phone_click_count', type: 'int', default: 0 })
phoneClickCount!: number;

@Column({ name: 'whatsapp_click_count', type: 'int', default: 0 })
whatsappClickCount!: number;
```

- [ ] **Step 3: Create `listing-engagement-event.entity.ts`**

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Listing } from './listing.entity';

export type EngagementType = 'view' | 'phone' | 'whatsapp';

@Entity('listing_engagement_events')
@Index('IDX_listing_engagement_listing_type_created', [
  'listingId',
  'type',
  'createdAt',
])
@Index('IDX_listing_engagement_created', ['createdAt'])
export class ListingEngagementEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId!: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

  @Column({ type: 'varchar', length: 20 })
  type!: EngagementType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
```

- [ ] **Step 4: Register entity in `listings.module.ts` `forFeature`**

- [ ] **Step 5: Run migration**

```bash
npm run migration:run -w @throttlelk/api
```

Expected: migration applied successfully.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/migrations/1726750000000-AddDealerInventoryAndEngagement.ts apps/api/src/listings/listing.entity.ts apps/api/src/listings/listing-engagement-event.entity.ts apps/api/src/listings/listings.module.ts
git commit -m "Add listing inventory columns and engagement events."
```

---

### Task 2: Validation schemas

**Files:**
- Modify: `packages/validation/src/index.ts`
- Test: extend or add `packages/validation` tests if present; otherwise rely on API Zod pipe + listings specs in later tasks

**Interfaces:**
- Produces: optional `costPriceLkr`, `purchaseDate` on create/update listing schemas
- Produces: `markSoldSchema` → `{ soldPriceLkr: number; soldAt?: string }`
- Produces: `contactClickSchema` → `{ type: 'phone' | 'whatsapp' }`
- Produces: `performanceRangeSchema` → `z.enum(['all','7d','30d']).default('all')`
- Produces: exported types `MarkSoldInput`, `ContactClickInput`, `PerformanceRange`

- [ ] **Step 1: Add helpers + schemas** near listing schemas:

```typescript
const optionalPositiveInt = z.number().int().positive().optional().nullable();
const optionalIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .nullable();

// extend createListingSchema:
costPriceLkr: optionalPositiveInt,
purchaseDate: optionalIsoDate,

export const markSoldSchema = z.object({
  soldPriceLkr: z.number().int().positive(),
  soldAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const contactClickSchema = z.object({
  type: z.enum(['phone', 'whatsapp']),
});

export const performanceRangeSchema = z.enum(['all', '7d', '30d']).default('all');

export type MarkSoldInput = z.infer<typeof markSoldSchema>;
export type ContactClickInput = z.infer<typeof contactClickSchema>;
export type PerformanceRange = z.infer<typeof performanceRangeSchema>;
```

Note: `updateListingSchema = createListingSchema.partial()` picks up the new fields automatically.

- [ ] **Step 2: Build validation package**

```bash
npm run build -w @throttlelk/validation
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add packages/validation/src/index.ts
git commit -m "Add validation for inventory, mark-sold, and contact clicks."
```

---

### Task 3: Record views as events + contact-click API

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts` — inject `ListingEngagementEvent` repo; update `recordView`; add `recordContactClick`
- Modify: `apps/api/src/listings/listings.controller.ts` — `POST :id/contact-clicks`
- Modify: `apps/api/src/common/rate-limit.ts` — optional reuse `'views'` for contact clicks (same bucket spirit) **or** add `contactClicks: { ttl: 60_000, limit: 60 }`
- Modify: `apps/api/src/listings/listings.service.spec.ts` — tests for view event + contact click
- Update `makeService` constructor args to pass engagement repo mock

**Interfaces:**
- Consumes: `ListingEngagementEvent`, `ContactClickInput`
- Produces: `recordView` still returns `{ recorded: boolean }`; on success also inserts `{ listingId, type: 'view' }`
- Produces: `recordContactClick(idOrSlug, type, viewer?): Promise<{ recorded: boolean }>`

- [ ] **Step 1: Write failing tests** in `listings.service.spec.ts`:

```typescript
describe('ListingsService.recordView', () => {
  it('increments viewCount and inserts a view event for active listings', async () => {
    // mock findOne active listing, increment, events.create/save
    // expect events.save called with type 'view'
  });

  it('skips seller own views', async () => {
    // viewer.id === sellerId → recorded false, no increment/event
  });
});

describe('ListingsService.recordContactClick', () => {
  it('increments phoneClickCount and inserts phone event', async () => { /* ... */ });
  it('returns recorded false / throws NotFound for non-active', async () => { /* ... */ });
  it('skips owner clicks when identifiable', async () => { /* ... */ });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/listings/listings.service.spec.ts -w @throttlelk/api
```

(From `apps/api`: `npx jest src/listings/listings.service.spec.ts`)

- [ ] **Step 3: Implement**

Inject:

```typescript
@InjectRepository(ListingEngagementEvent)
private readonly engagementEvents: Repository<ListingEngagementEvent>,
```

Update `recordView` after ownership/status checks:

```typescript
await this.listings.increment({ id: listing.id }, 'viewCount', 1);
await this.engagementEvents.save(
  this.engagementEvents.create({ listingId: listing.id, type: 'view' }),
);
return { recorded: true as const };
```

Add `recordContactClick`:

```typescript
async recordContactClick(
  idOrSlug: string,
  type: 'phone' | 'whatsapp',
  viewer?: User | null,
) {
  // same id/slug resolve as recordView; require status === 'active' else NotFoundException LISTING_NOT_FOUND
  // if viewer?.id === listing.sellerId → return { recorded: false }
  const column = type === 'phone' ? 'phoneClickCount' : 'whatsappClickCount';
  await this.listings.increment({ id: listing.id }, column, 1);
  await this.engagementEvents.save(
    this.engagementEvents.create({ listingId: listing.id, type }),
  );
  return { recorded: true as const };
}
```

Controller (near views; use `OptionalJwtAuthGuard` + `@RateLimit('views')`):

```typescript
@UseGuards(OptionalJwtAuthGuard)
@RateLimit('views')
@Post(':id/contact-clicks')
async recordContactClick(
  @Param('id') id: string,
  @Body(new ZodValidationPipe(contactClickSchema)) body: ContactClickInput,
  @Req() req: Request & { user?: User },
): Promise<ApiSuccess<{ recorded: boolean }>> {
  return {
    success: true,
    data: await this.listingsService.recordContactClick(
      id,
      body.type,
      req.user ?? null,
    ),
  };
}
```

- [ ] **Step 4: Fix `makeService` arity** — pass `{ create, save }` engagement mock as extra constructor arg in the correct position.

- [ ] **Step 5: Run tests — expect PASS**

- [ ] **Step 6: Commit**

```bash
git commit -m "Track listing views and phone/WhatsApp clicks as engagement events."
```

---

### Task 4: Inventory on create/update, mark-sold, owner DTO

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts` — `create`/`update`/`markSold`/`listMine` (+ any owner get)
- Modify: `apps/api/src/listings/listings.controller.ts` — mark-sold body pipe
- Modify: `apps/api/src/listings/listings.service.spec.ts`
- Optionally: `FavouritesService` batch count helper, or query in `listMine`

**Interfaces:**
- Consumes: `CreateListingInput.costPriceLkr?`, `purchaseDate?`; `MarkSoldInput`
- Produces: owner card extras:
  - `costPriceLkr`, `purchaseDate`, `soldPriceLkr`, `soldAt`
  - `phoneClickCount`, `whatsappClickCount`, `favouriteCount`
  - `daysInStock: number`, `marginLkr: number | null`, `marginPercent: number | null`
- Produces: `markSold(seller, id, input: MarkSoldInput)`
- Public `toBrowseCard` / `getPublic` must **not** add inventory/click/favourite fields

**Helpers (private on service):**

```typescript
private daysInStock(listing: Listing, asOf = new Date()): number {
  const start =
    listing.purchaseDate
      ? new Date(listing.purchaseDate)
      : listing.publishedAt ?? listing.createdAt;
  const end = listing.soldAt ?? asOf;
  return Math.max(
    0,
    Math.floor((end.getTime() - new Date(start).getTime()) / 86_400_000),
  );
}

private marginFields(listing: Listing): {
  marginLkr: number | null;
  marginPercent: number | null;
} {
  if (listing.costPriceLkr == null) {
    return { marginLkr: null, marginPercent: null };
  }
  const sell =
    listing.soldPriceLkr != null ? listing.soldPriceLkr : listing.priceLkr;
  const marginLkr = sell - listing.costPriceLkr;
  const marginPercent =
    listing.costPriceLkr > 0
      ? Math.round((marginLkr / listing.costPriceLkr) * 1000) / 10
      : null;
  return { marginLkr, marginPercent };
}
```

- [ ] **Step 1: Failing tests**

```typescript
it('markSold requires soldPriceLkr and sets soldPriceLkr + soldAt', async () => { /* ... */ });
it('create stores costPriceLkr/purchaseDate only when listing has dealerId', async () => { /* ... */ });
it('listMine includes owner inventory fields; toBrowseCard public path does not', async () => { /* ... */ });
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement create/update**

In `create`, after `dealerId` resolved:

```typescript
costPriceLkr: dealerId ? (input.costPriceLkr ?? null) : null,
purchaseDate: dealerId ? (input.purchaseDate ?? null) : null,
```

In `update`, only assign inventory fields when `listing.dealerId` is set; if private seller, ignore `costPriceLkr` / `purchaseDate` even if sent.

- [ ] **Step 4: Implement markSold**

```typescript
async markSold(seller: User, id: string, input: MarkSoldInput): Promise<Listing> {
  const listing = await this.getOwned(seller.id, id);
  if (!['active', 'paused'].includes(listing.status)) {
    throw new BadRequestException({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Cannot mark sold from this status' },
    });
  }
  listing.status = 'sold';
  listing.soldPriceLkr = input.soldPriceLkr;
  listing.soldAt = input.soldAt
    ? new Date(`${input.soldAt}T12:00:00.000Z`)
    : new Date();
  const saved = await this.listings.save(listing);
  this.bumpDashboard();
  return saved;
}
```

Controller:

```typescript
@Body(new ZodValidationPipe(markSoldSchema)) body: MarkSoldInput,
// ...
data: await this.listingsService.markSold(user, id, body),
```

- [ ] **Step 5: Enrich `listMine` items**

For each row (dealer listings especially; safe to include for all owners):

```typescript
const favCounts = await this.favouriteCountsByListingId(rows.map((r) => r.id));
// ...
{
  ...this.toBrowseCard(...),
  status: row.status,
  costPriceLkr: row.costPriceLkr,
  purchaseDate: row.purchaseDate,
  soldPriceLkr: row.soldPriceLkr,
  soldAt: row.soldAt?.toISOString() ?? null,
  phoneClickCount: row.phoneClickCount ?? 0,
  whatsappClickCount: row.whatsappClickCount ?? 0,
  favouriteCount: favCounts.get(row.id) ?? 0,
  daysInStock: this.daysInStock(row),
  ...this.marginFields(row),
}
```

Implement `favouriteCountsByListingId` via:

```typescript
this.favouritesRepo // or inject Favourite repo / FavouritesService method
  .createQueryBuilder('f')
  .select('f.listing_id', 'listingId')
  .addSelect('COUNT(*)', 'count')
  .where('f.listing_id IN (:...ids)', { ids })
  .groupBy('f.listing_id')
```

Prefer adding `FavouritesService.countsByListingIds(ids: string[]): Promise<Map<string, number>>` to keep layering clean.

- [ ] **Step 6: Confirm public serializers unchanged** — grep `toBrowseCard` / `getPublic` for absence of `costPrice`.

- [ ] **Step 7: Tests PASS + commit**

```bash
git commit -m "Add dealer inventory fields and sold-price mark-sold flow."
```

---

### Task 5: Dealer Performance API

**Files:**
- Modify: `apps/api/src/dealers/dealers.service.ts` — `performance(ownerUserId, range)`
- Modify: `apps/api/src/dealers/dealers.controller.ts` — `GET mine/performance`
- Create or modify: `apps/api/src/dealers/dealers.service.spec.ts`
- Inject: `Listing`, `ListingEngagementEvent`, `Favourite` repos (or query via existing Listing repo + Favourites)

**Interfaces:**
- Produces:

```typescript
type DealerPerformance = {
  range: 'all' | '7d' | '30d';
  activeListings: number;
  views: number;
  phoneClicks: number;
  whatsappClicks: number;
  favourites: number;
};
```

- `GET /api/v1/dealers/mine/performance?range=all|7d|30d` — JWT; 403 if no owned active dealer (same gate as other dealer-mine ops — use `findActiveOwned`; if null throw Forbidden)

**Range window helper:**

```typescript
function rangeStart(range: 'all' | '7d' | '30d'): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (range === '7d' ? 7 : 30));
  return d;
}
```

- [ ] **Step 1: Failing tests** for `performance`:
  - no dealer → Forbidden
  - `activeListings` counts seller listings with `status=active` and `dealerId` set (or all listings under owner with dealerId)
  - with seeded events/favourites, `7d` excludes older rows; `all` includes them

- [ ] **Step 2: Implement `performance`**

Logic sketch:

1. `const dealer = await this.findActiveOwned(ownerUserId)`; if !dealer → ForbiddenException
2. `activeListings` = COUNT listings where `dealerId = dealer.id` AND `status = 'active'` AND `deletedAt IS NULL`
3. Listing IDs for dealer: all non-deleted listing ids with that `dealerId` (include sold for historical clicks)
4. If no ids → zeros for metrics
5. Views/phone/whatsapp:
   - `all`: `SUM(view_count)`, `SUM(phone_click_count)`, `SUM(whatsapp_click_count)` on those listings **or** COUNT events by type — prefer **SUM of counters for `all`**, COUNT events for `7d`/`30d` so they stay consistent with filterable views
   - Spec requires views filterable via events → for **all ranges** COUNT from `listing_engagement_events` filtered by listing_id IN (...) AND type AND optional `created_at >= start`. Lifetime counters remain for card display; Performance page uses events (+ favourites table) so `all`/`7d`/`30d` share one code path.
6. Favourites: COUNT from `favourites` where `listing_id IN (...)` and optional `created_at >= start`

- [ ] **Step 3: Controller** — place **before** `@Get(':slug')` if any conflict; `mine/performance` is fine next to `mine`:

```typescript
@UseGuards(JwtAuthGuard)
@Get('mine/performance')
async minePerformance(
  @CurrentUser() user: User,
  @Query('range', new ZodValidationPipe(performanceRangeSchema))
  range: PerformanceRange,
): Promise<ApiSuccess<DealerPerformance>> {
  return {
    success: true,
    data: await this.dealersService.performance(user.id, range),
  };
}
```

If `ZodValidationPipe` on query is awkward for defaults, parse manually:

```typescript
const parsed = performanceRangeSchema.safeParse(range ?? 'all');
```

- [ ] **Step 4: Tests PASS + commit**

```bash
git commit -m "Add dealer performance aggregates endpoint."
```

---

### Task 6: Web — contact click tracking

**Files:**
- Modify: `apps/web/src/components/listing-actions.tsx`
- Optionally small helper `apps/web/src/lib/record-contact-click.ts`

**Interfaces:**
- Consumes: `POST /api/v1/listings/${listingId}/contact-clicks` with `{ type }`
- Fire-and-forget (void); do not block navigation if request fails

- [ ] **Step 1: Helper**

```typescript
export function recordContactClick(
  listingId: string,
  type: 'phone' | 'whatsapp',
) {
  void fetch(`/api/v1/listings/${listingId}/contact-clicks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
    credentials: 'include',
  }).catch(() => undefined);
}
```

Use the same API base pattern as other client calls (`apiSend` if it supports unauthenticated optional JWT via cookies/token). Prefer existing `apiSend` from `@/lib/api` if it attaches auth when present.

- [ ] **Step 2: In `listing-actions.tsx`**, on Call / WhatsApp click (or `onClick` on the anchors):

```tsx
onClick={() => recordContactClick(listingId, 'phone')}
// ...
onClick={() => recordContactClick(listingId, 'whatsapp')}
```

Ensure `listingId` is available on the component props (add prop if only slug exists today).

- [ ] **Step 3: Manual smoke** — open active listing, click Call/WA, confirm DB counters/events increment (or network 200).

- [ ] **Step 4: Commit**

```bash
git commit -m "Record phone and WhatsApp clicks from listing detail."
```

---

### Task 7: Web — sold dialog + owner metrics on My listings

**Files:**
- Modify: `apps/web/src/app/[locale]/account/listings/my-listings-client.tsx`
- Modify: `apps/web/src/components/listing-card.tsx` only if needed for optional owner metric row (prefer keep public card clean; render owner strip in `my-listings-client` below/inside card actions area)

**Interfaces:**
- Consumes: mark-sold JSON body; owner fields from `listMine`
- Produces: modal with required sold price + optional sold date

- [ ] **Step 1: Extend local `Listing` type** with optional owner fields from API.

- [ ] **Step 2: Replace immediate `runAction(...mark-sold)`** with opening dialog state `{ listingId, title, askingPrice }`.

Dialog fields:
- Sold price (number, default = `priceLkr`)
- Sold date (date input, optional, default today)

Submit:

```typescript
await apiSend(`/api/v1/listings/${id}/mark-sold`, {
  method: 'POST',
  token,
  body: {
    soldPriceLkr: Number(soldPrice),
    soldAt: soldDate || undefined, // YYYY-MM-DD
  },
});
```

- [ ] **Step 3: Owner metrics strip** (dealer listings / when fields present): show views, phone clicks, WA clicks, favourites; if `costPriceLkr` or `daysInStock` present, show days in stock + cost; if margin non-null, show margin. Use existing typography; no new card chrome beyond a compact metadata row.

- [ ] **Step 4: Smoke My listings mark-sold with price.**

- [ ] **Step 5: Commit**

```bash
git commit -m "Add sold-price dialog and owner metrics on My listings."
```

---

### Task 8: Web — inventory fields on sell + edit

**Files:**
- Modify: `apps/web/src/app/[locale]/sell/sell-form.tsx`
- Modify: `apps/web/src/app/[locale]/account/listings/[id]/edit/edit-listing-form.tsx`
- Modify: `apps/web/src/lib/i18n.ts` — labels (can batch with Task 9 if preferred; include at least inventory keys here)

**Interfaces:**
- When `dealers.length > 0` (sell) or listing has dealer (edit): show optional `purchaseDate`, `costPriceLkr` with helper “Not shown publicly”

- [ ] **Step 1: Add form state + inputs** next to price fields; include in submit payload only when dealer listing.

- [ ] **Step 2: Edit form loads existing `costPriceLkr` / `purchaseDate` from owner GET (ensure edit fetch returns them — if edit uses a public endpoint, switch to owner payload or patch `getOwned` response used by edit page).

Check edit page data source; if it uses public detail, extend the owner listing GET used for edit or include fields on the endpoint the form already calls.

- [ ] **Step 3: Commit**

```bash
git commit -m "Add optional dealer inventory fields to sell and edit forms."
```

---

### Task 9: Web — Performance page + nav + i18n

**Files:**
- Create: `apps/web/src/app/[locale]/account/performance/page.tsx`
- Create: `apps/web/src/app/[locale]/account/performance/performance-client.tsx`
- Modify: `apps/web/src/components/account-sidebar.tsx` — insert Performance after Showroom (`dealerOnly: true`)
- Modify: `apps/web/src/lib/i18n.ts` — all Performance + remaining inventory/sold dialog keys (en + si)

**Interfaces:**
- Consumes: `GET /api/v1/dealers/mine/performance?range=`
- Range control updates query or local state and refetches

- [ ] **Step 1: i18n keys** (en + si), examples:

```typescript
performance: 'Performance',
performanceSubtitle: 'Views, contact clicks, and saves across your stock.',
metricActiveListings: 'Active listings',
metricViews: 'Views',
metricPhoneClicks: 'Phone clicks',
metricWhatsappClicks: 'WhatsApp clicks',
metricFavourites: 'Saved',
rangeAll: 'All time',
range7d: 'Last 7 days',
range30d: 'Last 30 days',
inventoryCostPrice: 'Cost price',
inventoryPurchaseDate: 'Purchase date',
inventoryPrivateHint: 'Private — not shown on your public listing',
soldPrice: 'Sold price',
soldDate: 'Sold date',
daysInStock: 'Days in stock',
margin: 'Margin',
// ... Sinhala equivalents
```

- [ ] **Step 2: Sidebar item**

```typescript
{
  href: `${base}/performance`,
  labelKey: 'performance',
  match: (p) => p.includes('/account/performance'),
  icon: <IconPerformance />, // simple chart/pulse SVG consistent with siblings
  dealerOnly: true,
},
```

Place after Showroom, before My listings.

- [ ] **Step 3: `performance-client.tsx`**

- Auth token + `apiGet` performance
- Tabs/buttons for ranges
- Five metric tiles; show `0` when empty
- If 403 / not dealer, show short message or redirect to account home

- [ ] **Step 4: `page.tsx`** — same pattern as showroom page (locale param, client child).

- [ ] **Step 5: Smoke as dealer: open Performance, switch ranges, confirm numbers move with seeded data.

- [ ] **Step 6: Commit**

```bash
git commit -m "Add dealer Performance account page and navigation."
```

---

### Task 10: End-to-end verification

**Files:** none new (checklist)

- [ ] **Step 1: API tests**

```bash
npm run test -w @throttlelk/api
```

Expected: PASS (or only pre-existing failures unrelated — fix any new failures).

- [ ] **Step 2: Typecheck / lint touched packages**

```bash
npm run build -w @throttlelk/validation -w @throttlelk/api
npm run lint -w @throttlelk/web -w @throttlelk/api
```

- [ ] **Step 3: Manual checklist**
  - [ ] Private seller: no Performance nav; sell form has no cost fields
  - [ ] Dealer: Performance shows five metrics; 7d/30d change clicks/views/saves
  - [ ] Public bike page: no cost/sold price in HTML/JSON
  - [ ] Call/WA on listing increments Performance after refresh
  - [ ] Mark sold dialog requires price; sold listing shows sold price/margin for owner when cost set
  - [ ] Optional cost/purchase on create/edit persist

- [ ] **Step 4: Final commit** only if verification fixed leftovers; otherwise done.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Performance page + range tabs | 5, 9 |
| active / views / phone / WA / favourites | 5 |
| Views filterable via events | 1, 3, 5 |
| Phone/WA click API + listing detail wiring | 3, 6 |
| Inventory columns private | 1, 4 |
| Optional cost/purchase on dealer forms | 4, 8 |
| Mark sold dialog sold price + optional date | 4, 7 |
| Days in stock + margin | 4, 7 |
| Dealer-only gating | 4, 5, 8, 9 |
| i18n en+si | 8–9 |
| Out of scope (charts, showroom clicks, CSV) | not implemented |

**Type consistency:** `range` values `all|7d|30d`; engagement `type` `view|phone|whatsapp`; mark-sold `soldPriceLkr` + optional `soldAt` `YYYY-MM-DD` throughout.
