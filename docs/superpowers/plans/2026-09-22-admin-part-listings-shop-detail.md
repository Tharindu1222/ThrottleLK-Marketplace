# Admin Part Listings & Parts Shop Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins full CRUD for part listings (parity with bike listings) and a parts-shop detail page that shows shop info, parts counts, and the shop’s full inventory.

**Architecture:** Extend Nest `PartListingsService` / `PartsDealersService` with admin list/CRUD and `partsCount`; expose routes on `AdminController`; add web Manage page `/admin/part-listings` plus `/admin/parts-dealers/[id]` detail, mirroring existing `admin-listings.tsx` / `admin-parts-dealers.tsx` patterns.

**Tech Stack:** NestJS + TypeORM, Zod (`@throttlelk/validation`), Next.js App Router admin components, Jest unit tests for services.

**Spec:** `docs/superpowers/specs/2026-09-22-admin-part-listings-shop-detail-design.md`

## Global Constraints

- Mirror bike admin UX (status filter, topbar search, pagination limit 20, modal editor, soft-delete for part listings).
- Keep existing Moderation pending/approve/reject for part listings and parts dealers unchanged.
- Public View: spare → `/{locale}/spare-parts/{slug}`, modified → `/{locale}/modified-parts/{slug}`.
- After API changes: `cd apps/api && npm run build &&` restart Nest (port 3001); `nest start` does not watch.
- Do not invent new design systems; reuse admin CSS classes (`admin-card`, `admin-btn-primary`, etc.).

## File map

| File | Responsibility |
|------|----------------|
| `packages/validation/src/index.ts` | `adminCreatePartListingSchema` / `adminUpdatePartListingSchema` + exported types |
| `apps/api/src/part-listings/part-listings.service.ts` | `listAllAdmin`, `adminGet`, `adminCreate`, `adminUpdate`, `adminDelete` |
| `apps/api/src/part-listings/part-listings.admin.spec.ts` | Unit tests for admin list/create/delete |
| `apps/api/src/parts-dealers/parts-dealers.service.ts` | Attach `partsCount` on list/get; optional status breakdown on detail |
| `apps/api/src/parts-dealers/parts-dealers.admin.spec.ts` | Unit test for `partsCount` |
| `apps/api/src/admin/admin.controller.ts` | Wire new part-listing admin routes (before `:id` conflicts) |
| `apps/web/src/lib/admin-types.ts` | `AdminPartListing` + `partsCount` on dealer rows |
| `apps/web/src/components/admin/admin-sidebar.tsx` | Nav item Part listings |
| `apps/web/src/components/admin/admin-layout-client.tsx` | Titles for `part-listings`, `parts-dealers`, `part-categories` |
| `apps/web/src/components/admin/admin-part-listing-image-manager.tsx` | Images via `/api/v1/admin/part-listings/:id/images` |
| `apps/web/src/components/admin/admin-part-listings.tsx` | Full CRUD table + editor |
| `apps/web/src/app/[locale]/admin/part-listings/page.tsx` | Route page |
| `apps/web/src/components/admin/admin-parts-dealers.tsx` | Parts count column + Open link |
| `apps/web/src/components/admin/admin-parts-dealer-detail.tsx` | Shop detail + inventory |
| `apps/web/src/app/[locale]/admin/parts-dealers/[id]/page.tsx` | Detail route |

---

### Task 1: Admin Zod schemas for part listings

**Files:**
- Modify: `packages/validation/src/index.ts` (after `updatePartListingSchema` ~line 258; export types near other Admin* types ~line 467)
- Rebuild: `packages/validation` so API can import (workspace usually resolves via TS paths; if build required: `npm run build -w @throttlelk/validation`)

**Interfaces:**
- Produces: `AdminCreatePartListingInput`, `AdminUpdatePartListingInput`
- Consumes: existing `createPartListingSchema`, `listingStatusSchema`

- [ ] **Step 1: Add schemas and types**

After `export const updatePartListingSchema = createPartListingSchema.partial();` add:

```typescript
export const adminCreatePartListingSchema = createPartListingSchema.extend({
  partsDealerId: z.string().uuid(),
  status: listingStatusSchema.optional().default('draft'),
});

export const adminUpdatePartListingSchema = createPartListingSchema
  .partial()
  .extend({
    partsDealerId: z.string().uuid().optional(),
    status: listingStatusSchema.optional(),
  });
```

Near other type exports add:

```typescript
export type AdminCreatePartListingInput = z.infer<
  typeof adminCreatePartListingSchema
>;
export type AdminUpdatePartListingInput = z.infer<
  typeof adminUpdatePartListingSchema
>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/validation/src/index.ts
git commit -m "Add admin Zod schemas for part listing CRUD."
```

---

### Task 2: PartListingsService admin methods (TDD)

**Files:**
- Create: `apps/api/src/part-listings/part-listings.admin.spec.ts`
- Modify: `apps/api/src/part-listings/part-listings.service.ts`

**Interfaces:**
- Consumes: `AdminCreatePartListingInput`, `AdminUpdatePartListingInput`; private helpers `allocateSlug`, `replaceFitments`, `validateFitments`, `coverUrlsByListingId`, `getById`, `bumpDashboard`
- Produces:
  - `listAllAdmin(filters?: { status?: string; kind?: string; q?: string; partsDealerId?: string; page?: string | number; limit?: string | number }): Promise<{ items: Array<PartListing & { coverImageUrl: string | null; images: []; partsDealer?: … }>; meta: PaginationMeta }>`
  - `adminGet(id: string): Promise<…>` (relations: partsDealer, category, district, city, fitments, images + cover)
  - `adminCreate(input: AdminCreatePartListingInput): Promise<…>`
  - `adminUpdate(id: string, input: AdminUpdatePartListingInput): Promise<…>`
  - `adminDelete(id: string): Promise<{ id: string; deleted: true }>` (softRemove)

- [ ] **Step 1: Write failing unit tests**

Create `apps/api/src/part-listings/part-listings.admin.spec.ts`:

```typescript
import { PartListingsService } from './part-listings.service';

describe('PartListingsService admin', () => {
  function buildService(overrides: Record<string, unknown> = {}) {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [
        [
          {
            id: 'pl-1',
            title: 'Brake pads',
            kind: 'spare',
            status: 'active',
            priceLkr: 5000,
            updatedAt: new Date(),
            partsDealer: { id: 'pd-1', name: 'Parts Co', slug: 'parts-co' },
          },
        ],
        1,
      ]),
    };
    const partListings = {
      createQueryBuilder: jest.fn(() => qb),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'pl-new', ...x })),
      softRemove: jest.fn(async () => undefined),
      findOne: jest.fn(async () => ({
        id: 'pl-1',
        title: 'Brake pads',
        status: 'draft',
        partsDealerId: 'pd-1',
      })),
      ...((overrides.partListings as object) ?? {}),
    };
    const service = new PartListingsService(
      partListings as never,
      { find: jest.fn(), delete: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { find: jest.fn() } as never,
      { find: jest.fn() } as never,
      { findActiveOwned: jest.fn(), findById: jest.fn() } as never,
      { findByIdOrThrow: jest.fn() } as never,
      { partListingPendingReview: jest.fn() } as never,
      { invalidateDashboard: jest.fn() } as never,
    );
    (service as unknown as { coverUrlsByListingId: Function }).coverUrlsByListingId =
      jest.fn(async () => new Map([['pl-1', 'https://cdn/x.jpg']]));
    (service as unknown as { allocateSlug: Function }).allocateSlug = jest.fn(
      async () => 'brake-pads-abc',
    );
    (service as unknown as { validateFitments: Function }).validateFitments =
      jest.fn(async () => undefined);
    (service as unknown as { replaceFitments: Function }).replaceFitments =
      jest.fn(async () => undefined);
    (service as unknown as { getById: Function }).getById = jest.fn(async () => ({
      id: 'pl-1',
      title: 'Brake pads',
      status: 'draft',
      partsDealerId: 'pd-1',
      publishedAt: null,
      soldAt: null,
      rejectionReason: null,
    }));
    return { service, partListings, qb };
  }

  it('listAllAdmin filters by partsDealerId and returns coverImageUrl', async () => {
    const { service, qb } = buildService();
    const result = await service.listAllAdmin({ partsDealerId: 'pd-1' });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'l.partsDealerId = :partsDealerId',
      { partsDealerId: 'pd-1' },
    );
    expect(result.items[0].coverImageUrl).toBe('https://cdn/x.jpg');
    expect(result.meta.total).toBe(1);
  });

  it('adminCreate sets partsDealerId and status', async () => {
    const { service, partListings } = buildService();
    await service.adminCreate({
      partsDealerId: 'pd-1',
      kind: 'spare',
      categoryId: '00000000-0000-4000-8000-000000000001',
      districtId: '00000000-0000-4000-8000-000000000002',
      cityId: '00000000-0000-4000-8000-000000000003',
      title: 'Brake pads set',
      description: 'OEM style brake pads for multiple models here.',
      priceLkr: 5000,
      negotiable: true,
      condition: 'new',
      phone: '0771234567',
      fitments: [{ brandId: '00000000-0000-4000-8000-000000000004' }],
      status: 'active',
    });
    expect(partListings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        partsDealerId: 'pd-1',
        status: 'active',
        publishedAt: expect.any(Date),
      }),
    );
  });

  it('adminDelete soft-removes the listing', async () => {
    const { service, partListings } = buildService();
    const result = await service.adminDelete('pl-1');
    expect(partListings.softRemove).toHaveBeenCalled();
    expect(result).toEqual({ id: 'pl-1', deleted: true });
  });
});
```

Adjust constructor argument order to match the real `PartListingsService` constructor in the file (read `@InjectRepository` order before writing the test).

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd apps/api
npx jest part-listings.admin.spec.ts --passWithNoTests 2>&1 | Select-Object -Last 30
```

Expected: FAIL (methods missing or constructor mismatch).

- [ ] **Step 3: Implement admin methods on PartListingsService**

Add imports for `AdminCreatePartListingInput`, `AdminUpdatePartListingInput` from `@throttlelk/validation`.

Implement (place near `listPending`):

```typescript
  async listAllAdmin(filters?: {
    status?: string;
    kind?: string;
    q?: string;
    partsDealerId?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: filters?.page,
      limit: filters?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const qb = this.partListings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.partsDealer', 'partsDealer')
      .leftJoinAndSelect('l.category', 'category')
      .leftJoinAndSelect('l.district', 'district')
      .leftJoinAndSelect('l.city', 'city')
      .orderBy('l.updatedAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('l.status = :status', { status: filters.status });
    }
    if (filters?.kind) {
      qb.andWhere('l.kind = :kind', { kind: filters.kind });
    }
    if (filters?.partsDealerId) {
      qb.andWhere('l.partsDealerId = :partsDealerId', {
        partsDealerId: filters.partsDealerId,
      });
    }
    if (filters?.q?.trim()) {
      const q = `%${filters.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(l.title) LIKE :q OR LOWER(l.slug) LIKE :q OR LOWER(partsDealer.name) LIKE :q)',
        { q },
      );
    }

    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const covers = await this.coverUrlsByListingId(rows.map((row) => row.id));
    return {
      items: rows.map((row) => ({
        ...row,
        images: [],
        coverImageUrl: covers.get(row.id) ?? null,
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  async adminGet(id: string) {
    const listing = await this.partListings.findOne({
      where: { id },
      relations: [
        'partsDealer',
        'category',
        'district',
        'city',
        'fitments',
        'images',
      ],
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'PART_LISTING_NOT_FOUND', message: 'Part listing not found' },
      });
    }
    const covers = await this.coverUrlsByListingId([listing.id]);
    return {
      ...listing,
      coverImageUrl: covers.get(listing.id) ?? null,
    };
  }

  async adminCreate(input: AdminCreatePartListingInput) {
    await this.validateFitments(input.fitments);
    const slug = await this.allocateSlug(input.title);
    const status = input.status ?? 'draft';
    const listing = this.partListings.create({
      partsDealerId: input.partsDealerId,
      kind: input.kind,
      categoryId: input.categoryId,
      districtId: input.districtId,
      cityId: input.cityId,
      title: input.title,
      slug,
      description: input.description,
      priceLkr: input.priceLkr,
      negotiable: input.negotiable ?? true,
      condition: input.condition,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      status,
      publishedAt: status === 'active' ? new Date() : null,
    });
    const saved = await this.partListings.save(listing);
    await this.replaceFitments(saved.id, input.fitments);
    this.bumpDashboard();
    if (status === 'pending_review') {
      void this.notifications.partListingPendingReview({
        id: saved.id,
        title: saved.title,
        slug: saved.slug,
        kind: saved.kind,
      });
    }
    return this.adminGet(saved.id);
  }

  async adminUpdate(id: string, input: AdminUpdatePartListingInput) {
    const listing = await this.getById(id);
    const { fitments, status, partsDealerId, ...fields } = input;
    if (fitments) {
      await this.validateFitments(fitments);
      await this.replaceFitments(listing.id, fitments);
    }
    if (partsDealerId) listing.partsDealerId = partsDealerId;
    Object.assign(listing, fields);
    if (status) {
      listing.status = status;
      if (status === 'active' && !listing.publishedAt) {
        listing.publishedAt = new Date();
      }
      if (status === 'sold' && !listing.soldAt) {
        listing.soldAt = new Date();
      }
      if (status !== 'rejected') {
        listing.rejectionReason = null;
      }
    }
    await this.partListings.save(listing);
    this.bumpDashboard();
    return this.adminGet(id);
  }

  async adminDelete(id: string): Promise<{ id: string; deleted: true }> {
    const listing = await this.getById(id);
    await this.partListings.softRemove(listing);
    this.bumpDashboard();
    return { id, deleted: true };
  }
```

If `getById` is private and returns without soft-deleted rows, that is correct. Ensure `validateFitments` / `replaceFitments` / `allocateSlug` remain usable (already private methods on the class).

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/api
npx jest part-listings.admin.spec.ts 2>&1 | Select-Object -Last 20
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/part-listings/part-listings.service.ts apps/api/src/part-listings/part-listings.admin.spec.ts
git commit -m "Add admin CRUD methods for part listings."
```

---

### Task 3: Parts dealers `partsCount` (TDD)

**Files:**
- Create: `apps/api/src/parts-dealers/parts-dealers.admin.spec.ts`
- Modify: `apps/api/src/parts-dealers/parts-dealers.service.ts`

**Interfaces:**
- Consumes: `PartListing` repository via `this.partsDealers.manager.getRepository(PartListing)` or inject `@InjectRepository(PartListing)`
- Produces: `listAllAdmin` items include `partsCount: number`; `adminGet` returns `partsCount` and `partsByStatus: { draft: number; pending_review: number; active: number; … }`

- [ ] **Step 1: Write failing test**

```typescript
import { PartsDealersService } from './parts-dealers.service';

describe('PartsDealersService partsCount', () => {
  it('adminGet includes partsCount', async () => {
    const dealer = {
      id: 'pd-1',
      name: 'Shop',
      images: [],
      owner: null,
      district: null,
      city: null,
    };
    const partsDealers = {
      findOne: jest.fn(async () => dealer),
      manager: {
        getRepository: jest.fn(() => ({
          createQueryBuilder: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn(async () => [
              { partsDealerId: 'pd-1', count: '4' },
            ]),
          })),
        })),
      },
    };
    // Wire PartsDealersService with mocked constructor deps (read real ctor).
    // Call adminGet('pd-1') and assert partsCount === 4.
  });
});
```

Prefer injecting/mocking `getRepository(PartListing)` as above. Production helper:



```typescript
  private async partsCountsByDealerId(
    dealerIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (dealerIds.length === 0) return map;
    const rows: Array<{ partsDealerId: string; count: string }> =
      await this.partsDealers.manager
        .getRepository(PartListing)
        .createQueryBuilder('l')
        .select('l.parts_dealer_id', 'partsDealerId')
        .addSelect('COUNT(*)', 'count')
        .where('l.parts_dealer_id IN (:...dealerIds)', { dealerIds })
        .andWhere('l.deleted_at IS NULL')
        .groupBy('l.parts_dealer_id')
        .getRawMany();
    for (const row of rows) {
      map.set(row.partsDealerId, Number(row.count));
    }
    return map;
  }
```

Import `PartListing` from `../part-listings/part-listing.entity`.

In `listAllAdmin`, after loading rows:

```typescript
    const counts = await this.partsCountsByDealerId(rows.map((r) => r.id));
    return {
      items: rows.map((row) => ({
        ...this.withCover(row),
        partsCount: counts.get(row.id) ?? 0,
      })),
      meta: paginationMeta(total, page, limit),
    };
```

In `adminGet`:

```typescript
    const covered = this.withCover(dealer);
    const counts = await this.partsCountsByDealerId([dealer.id]);
    const byStatusRows: Array<{ status: string; count: string }> =
      await this.partsDealers.manager
        .getRepository(PartListing)
        .createQueryBuilder('l')
        .select('l.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('l.parts_dealer_id = :id', { id: dealer.id })
        .andWhere('l.deleted_at IS NULL')
        .groupBy('l.status')
        .getRawMany();
    const partsByStatus: Record<string, number> = {};
    for (const row of byStatusRows) {
      partsByStatus[row.status] = Number(row.count);
    }
    return {
      ...covered,
      partsCount: counts.get(dealer.id) ?? 0,
      partsByStatus,
    };
```

- [ ] **Step 2: Run failing test, then implement, then pass**

```bash
cd apps/api
npx jest parts-dealers.admin.spec.ts 2>&1 | Select-Object -Last 25
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/parts-dealers/parts-dealers.service.ts apps/api/src/parts-dealers/parts-dealers.admin.spec.ts
git commit -m "Attach partsCount to admin parts dealer list and detail."
```

---

### Task 4: Admin controller routes for part listings CRUD

**Files:**
- Modify: `apps/api/src/admin/admin.controller.ts`

**Interfaces:**
- Consumes: `PartListingsService.listAllAdmin|adminGet|adminCreate|adminUpdate|adminDelete`
- Produces: HTTP routes under `/api/v1/admin/part-listings`

**Route order (critical):** Place `GET part-listings` and `POST part-listings` **before** `GET part-listings/pending` is fine; place static `pending` **before** `:id`. Today pending already exists — insert list/create adjacent, and add `GET/:id`, `PATCH/:id`, `DELETE/:id` next to approve/reject without shadowing `pending`.

- [ ] **Step 1: Import schemas/types**

Add to imports from `@throttlelk/validation`:

```typescript
  adminCreatePartListingSchema,
  adminUpdatePartListingSchema,
  type AdminCreatePartListingInput,
  type AdminUpdatePartListingInput,
```

- [ ] **Step 2: Add handlers**

Near existing part-listings pending block, add:

```typescript
  @Get('part-listings')
  async listPartListings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('partsDealerId') partsDealerId?: string,
  ): Promise<ApiSuccess<unknown>> {
    const { items, meta } = await this.partListingsService.listAllAdmin({
      page,
      limit,
      q,
      status,
      kind,
      partsDealerId,
    });
    return { success: true, data: items, meta };
  }

  @Get('part-listings/:id')
  async getPartListing(@Param('id') id: string): Promise<ApiSuccess<unknown>> {
    // Guard: if id === 'pending', Nest may conflict — keep @Get('part-listings/pending')
    // declared ABOVE this route.
    return {
      success: true,
      data: await this.partListingsService.adminGet(id),
    };
  }

  @Post('part-listings')
  async createPartListing(
    @Body(new ZodValidationPipe(adminCreatePartListingSchema))
    body: AdminCreatePartListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.adminCreate(body),
    };
  }

  @Patch('part-listings/:id')
  async updatePartListing(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdatePartListingSchema))
    body: AdminUpdatePartListingInput,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.adminUpdate(id, body),
    };
  }

  @Delete('part-listings/:id')
  async deletePartListing(
    @Param('id') id: string,
  ): Promise<ApiSuccess<unknown>> {
    return {
      success: true,
      data: await this.partListingsService.adminDelete(id),
    };
  }
```

Ensure `@Get('part-listings/pending')` remains **above** `@Get('part-listings/:id')`.

- [ ] **Step 3: Build API**

```bash
cd apps/api
npx tsc --noEmit -p tsconfig.json
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/admin/admin.controller.ts
git commit -m "Expose admin part listing list and CRUD routes."
```

---

### Task 5: Web types, sidebar, layout titles

**Files:**
- Modify: `apps/web/src/lib/admin-types.ts`
- Modify: `apps/web/src/components/admin/admin-sidebar.tsx`
- Modify: `apps/web/src/components/admin/admin-layout-client.tsx`

- [ ] **Step 1: Types**

Add to `admin-types.ts`:

```typescript
export type AdminPartListing = {
  id: string;
  title: string;
  slug: string;
  kind: 'spare' | 'modified';
  priceLkr: number;
  status: string;
  condition: string;
  negotiable: boolean;
  categoryId: string;
  districtId: string;
  cityId: string;
  partsDealerId: string;
  description: string;
  phone: string | null;
  whatsapp: string | null;
  updatedAt: string;
  coverImageUrl?: string | null;
  partsDealer?: { id: string; name: string; slug: string } | null;
  category?: { id: string; name: string } | null;
  fitments?: Array<{
    id?: string;
    brandId: string;
    modelId: string | null;
  }>;
};

export type AdminPartsDealerRow = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  status: string;
  partsCount: number;
  partsByStatus?: Record<string, number>;
  coverImageUrl?: string | null;
  // …retain other fields used by admin-parts-dealers
};
```

- [ ] **Step 2: Sidebar**

In `admin-sidebar.tsx` Manage items, after Listings insert:

```typescript
      { href: '/part-listings', label: 'Part listings', icon: ListingsIcon },
```

- [ ] **Step 3: Layout titles**

In `admin-layout-client.tsx` `titles` record add:

```typescript
  'part-listings': {
    title: 'Part listings',
    subtitle: 'Manage spare and modified part listings',
    placeholder: 'Search part listings…',
  },
  'parts-dealers': {
    title: 'Parts shops',
    subtitle: 'Manage parts dealer shops',
    placeholder: 'Search parts shops…',
  },
  'part-categories': {
    title: 'Part categories',
    subtitle: 'Manage spare and modified part categories',
    placeholder: 'Search categories…',
  },
```

Note: detail route `parts-dealers/[id]` uses segment `parts-dealers` (first path segment) — same title is fine; detail page has its own H1.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/admin-types.ts apps/web/src/components/admin/admin-sidebar.tsx apps/web/src/components/admin/admin-layout-client.tsx
git commit -m "Add admin nav and types for part listings."
```

---

### Task 6: Admin part listings UI (page + CRUD component + image manager)

**Files:**
- Create: `apps/web/src/components/admin/admin-part-listing-image-manager.tsx`
- Create: `apps/web/src/components/admin/admin-part-listings.tsx`
- Create: `apps/web/src/app/[locale]/admin/part-listings/page.tsx`

**Interfaces:**
- Consumes: `GET/POST/PATCH/DELETE /api/v1/admin/part-listings`, images endpoints, `GET /api/v1/admin/parts-dealers`, `GET /api/v1/admin/part-categories`, taxonomy brands/models/districts/cities (same as account parts editor / admin listings)
- Optional query: `partsDealerId` from `useSearchParams()` to preselect shop and filter table

- [ ] **Step 1: Image manager**

Copy `admin-listing-image-manager.tsx` to `admin-part-listing-image-manager.tsx` and change API base to `/api/v1/admin/part-listings/${listingId}/images` (list GET, upload POST, delete DELETE). Export `AdminPartListingImageManager`.

- [ ] **Step 2: Page**

`apps/web/src/app/[locale]/admin/part-listings/page.tsx`:

```tsx
'use client';

import { AdminPartListings } from '@/components/admin/admin-part-listings';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminPartListingsPage() {
  const { search } = useAdminSearch();
  return <AdminPartListings search={search} />;
}
```

- [ ] **Step 3: Implement `AdminPartListings`**

Build by adapting `admin-listings.tsx` with these concrete differences:

1. Row type = `AdminPartListing` from `@/lib/admin-types`.
2. Load: `apiGetWithMeta<AdminPartListing[]>('/api/v1/admin/part-listings', { searchParams: { page, limit: '20', q: search || undefined, status, kind, partsDealerId } })`.
3. Extra filter select for kind: `'' | 'spare' | 'modified'`.
4. Columns: Title (thumb + kind), Shop (`partsDealer?.name`), Price, Status (inline PATCH), Updated, Actions.
5. View href: `listing.kind === 'modified' ? \`/\${locale}/modified-parts/\${listing.slug}\` : \`/\${locale}/spare-parts/\${listing.slug}\``.
6. FormState fields: `partsDealerId`, `kind`, `categoryId`, `districtId`, `cityId`, `title`, `description`, `priceLkr`, `negotiable`, `condition`, `phone`, `whatsapp`, `status`, `fitments: Array<{ brandId: string; modelId: string }>`.
7. Create POST `/api/v1/admin/part-listings` body must include `fitments` min 1.
8. After save show `AdminPartListingImageManager`.
9. Status options: `draft`, `pending_review`, `active`, `rejected`, `paused`, `sold`, `expired`.
10. Load shops: `apiGetWithMeta` or list `GET /api/v1/admin/parts-dealers?limit=100` for select options.
11. Load categories: existing admin part-categories GET.
12. Support `?partsDealerId=` from URL to set initial filter + form default.

Keep the same modal / table markup patterns as `admin-listings.tsx` (admin-card, admin-btn-primary, Pagination).

- [ ] **Step 4: Manual smoke**

With API restarted on 3001 and web `npm run dev`:

1. Open `/en/admin/part-listings` — table loads (may be empty).
2. Create a part for an active parts shop — appears in table.
3. Inline status change works.
4. Images upload works.
5. Delete soft-removes row from list.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/admin-part-listing-image-manager.tsx apps/web/src/components/admin/admin-part-listings.tsx apps/web/src/app/[locale]/admin/part-listings/page.tsx
git commit -m "Add admin Part listings manage page with full CRUD."
```

---

### Task 7: Parts shops list — count + Open

**Files:**
- Modify: `apps/web/src/components/admin/admin-parts-dealers.tsx`

- [ ] **Step 1: Extend DealerRow**

```typescript
type DealerRow = {
  // existing fields…
  partsCount?: number;
  coverImageUrl?: string | null;
};
```

- [ ] **Step 2: Table columns**

Add column header **Parts** showing `dealer.partsCount ?? 0`.

Add **Open** link (use `useParams` for locale):

```tsx
import Link from 'next/link';
import { useParams } from 'next/navigation';
// …
const locale = useParams().locale as string;
// in actions:
<Link
  href={`/${locale}/admin/parts-dealers/${dealer.id}`}
  className="admin-btn-ghost px-2 py-1 text-sm"
>
  Open
</Link>
```

Also wrap shop name in the same Link.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/admin-parts-dealers.tsx
git commit -m "Show parts count and Open link on parts shops list."
```

---

### Task 8: Parts shop detail page

**Files:**
- Create: `apps/web/src/components/admin/admin-parts-dealer-detail.tsx`
- Create: `apps/web/src/app/[locale]/admin/parts-dealers/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/admin/parts-dealers/:id` → shop + `partsCount` + `partsByStatus`
- Consumes: `GET /api/v1/admin/part-listings?partsDealerId=:id` for inventory table
- Links to `/admin/part-listings?partsDealerId=:id` for “Add part” / full editor

- [ ] **Step 1: Detail component**

`AdminPartsDealerDetail({ id }: { id: string })`:

1. Load shop via `apiGet(\`/api/v1/admin/parts-dealers/\${id}\`)`.
2. Header: name, status badge, verified, owner email, phone, location, description, cover image.
3. Chips: Total parts (`partsCount`); optional per-status from `partsByStatus`.
4. Actions: Back → `/{locale}/admin/parts-dealers`; Public view → `/{locale}/parts-dealers/{slug}`; Add part → `/{locale}/admin/part-listings?partsDealerId={id}` (opens create — Task 6 reads query).
5. Inventory: reuse a compact table (or embed filtered fetch) listing that shop’s parts with View/Edit links to part-listings page (edit can navigate with hash or open admin part listings and pass id — simplest: Link to `/admin/part-listings` with search `q=title` or dedicated `?editId=` if implemented; otherwise Edit button calls same PATCH modal by lifting a small shared editor — acceptable MVP: link “Manage in Part listings” with `partsDealerId` filter).

MVP inventory row actions:

- View public part URL
- “Edit in Part listings” → `/{locale}/admin/part-listings?partsDealerId={id}&q={encodeURIComponent(title)}`

- [ ] **Step 2: Page**

```tsx
'use client';

import { useParams } from 'next/navigation';
import { AdminPartsDealerDetail } from '@/components/admin/admin-parts-dealer-detail';

export default function AdminPartsDealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <AdminPartsDealerDetail id={id} />;
}
```

- [ ] **Step 3: Smoke test**

1. Parts shops list shows counts.
2. Open shop → detail shows profile + inventory.
3. Add part → creates under that shop; count increments after refresh.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/admin-parts-dealer-detail.tsx "apps/web/src/app/[locale]/admin/parts-dealers/[id]/page.tsx"
git commit -m "Add admin parts shop detail with inventory view."
```

---

### Task 9: Restart API and verify end-to-end

- [ ] **Step 1: Restart API with new build**

```bash
# find PID on 3001 (Windows)
netstat -ano | findstr :3001
# Stop-Process -Id <pid> -Force
cd apps/api
npm run build
npm start
```

Expected log: `Nest application successfully started` without `EADDRINUSE`.

- [ ] **Step 2: Verify checklist (from spec success criteria)**

1. `/en/admin/part-listings` — list/create/edit/status/images/delete.
2. Parts shops table shows parts counts.
3. Shop Open → full details + inventory; can add parts.
4. Moderation pending part listings / parts dealers still work.
5. Sidebar Part listings + topbar search placeholders correct.

- [ ] **Step 3: Final commit only if leftover fixes**

```bash
git status
# commit any verification fixes with a clear message
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Part listings manage page full CRUD | 6 (+ API 1–4) |
| Status/kind filters, search, pagination | 2, 6 |
| Editor fields + fitments + images | 1, 2, 6 |
| Parts shops Parts count column | 3, 7 |
| Open → shop detail | 7, 8 |
| Detail profile + inventory + Add part | 8 |
| API list/CRUD + partsDealerId filter | 2, 4 |
| `partsCount` / breakdown on dealer | 3 |
| Sidebar + topbar | 5 |
| Moderation unchanged | (no task mutates moderation) |
| Soft-delete part listings | 2 `adminDelete` |
| Public View URLs by kind | 6, 8 |

## Placeholder scan

No TBD/TODO left in task steps; constructor mock note in Task 2/3 requires reading real constructors (explicit).

## Type consistency

- Schema names: `adminCreatePartListingSchema` / `AdminCreatePartListingInput` used in Tasks 1, 2, 4.
- Query param: `partsDealerId` consistent across service, controller, web.
- Field: `partsCount` / `partsByStatus` on dealer admin payloads.
