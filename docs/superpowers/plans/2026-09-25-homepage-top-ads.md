# Homepage Top Ads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sellers request paid homepage placements (package → bank → slip); admin approves or overrides; homepage shows paid ads first and fills with newest listings.

**Architecture:** New `promotions` Nest module owns packages, bank accounts, settings, requests, and placements. Public `GET /api/v1/home/marketplace-preview` returns bikes/parts with `isTop`. Admin UI at `/{locale}/admin/homepage-ads`. Seller promote pages under account listings.

**Tech Stack:** NestJS + TypeORM + Zod (`@throttlelk/validation`) + Next.js App Router + existing R2 `StorageService`.

## Global Constraints

- Slip MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` only; max 5MB
- Slips are private: no public URL; admin authenticated stream only
- One pending request OR one live placement per listing/part
- Homepage max 8 bikes + 8 parts; paid first, newest fill, no duplicates
- Admin UI English; seller + homepage strings EN + SI
- No PayHere; WhatsApp is optional `wa.me` button
- Do not boost browse/search rank

---

### File map

**Create**

- `apps/api/src/promotions/promo-package.entity.ts`
- `apps/api/src/promotions/promo-bank-account.entity.ts`
- `apps/api/src/promotions/promo-settings.entity.ts`
- `apps/api/src/promotions/promo-request.entity.ts`
- `apps/api/src/promotions/homepage-placement.entity.ts`
- `apps/api/src/promotions/promotions.service.ts`
- `apps/api/src/promotions/promotions.service.spec.ts`
- `apps/api/src/promotions/promotions.controller.ts`
- `apps/api/src/promotions/admin-promotions.controller.ts`
- `apps/api/src/promotions/home.controller.ts`
- `apps/api/src/promotions/promotions.module.ts`
- `apps/api/src/migrations/1727000000000-AddHomepagePromotions.ts`
- `apps/web/src/app/[locale]/admin/homepage-ads/page.tsx`
- `apps/web/src/components/admin/admin-homepage-ads.tsx`
- `apps/web/src/app/[locale]/account/listings/[id]/promote/page.tsx`
- `apps/web/src/app/[locale]/account/parts-listings/[id]/promote/page.tsx`
- `apps/web/src/components/promote-listing-form.tsx`
- `apps/web/src/lib/whatsapp-href.ts`

**Modify**

- `packages/validation/src/index.ts` — promo Zod schemas
- `apps/api/src/app.module.ts` — import PromotionsModule
- `apps/api/src/storage/storage.service.ts` — `getObject`
- `apps/api/src/listings/listings.service.ts` — `browseCardsByIds`
- `apps/api/src/part-listings/part-listings.service.ts` — `browseCardsByIds`
- `apps/api/src/notifications/notifications.service.ts` — promo approve/reject
- `apps/api/src/admin/admin.service.ts` — `pendingPromoRequests`
- `apps/web/src/app/[locale]/page.tsx` — preview endpoint
- `apps/web/src/components/home/home-marketplace-preview.tsx` — Top labels + `isTop`
- `apps/web/src/components/listing-card.tsx` / `part-card.tsx` — Top badge
- `apps/web/src/components/admin/admin-sidebar.tsx` — nav + badge
- `apps/web/src/lib/admin-types.ts` — dashboard field
- `apps/web/src/lib/i18n.ts` — seller + homepage copy
- my-listings clients — Promote + status

---

### Task 1: Validation + entities + failing service tests

**Files:** validation package, promotion entities, `promotions.service.spec.ts`

**Interfaces produced:**

- `PromoSubjectType = 'bike' | 'part'`
- `PromoRequestStatus = 'pending' | 'approved' | 'rejected'`
- `createPromoPackageSchema`, `createPromoBankAccountSchema`, `rejectPromoRequestSchema`, `adminPlaceHomepageSchema`

- [ ] Add Zod schemas and entity classes
- [ ] Write `promotions.service.spec.ts` covering: submit blocked without slip/bank; duplicate pending/live blocked; approve sets `endsAt`; reject requires reason; preview orders live first and fills to 8; sold listing excluded; admin override updates live row and auto-rejects pending; slip MIME allow-list
- [ ] Run tests — expect FAIL (service missing)
- [ ] Implement service + storage getObject + controllers + module
- [ ] Run tests — expect PASS

### Task 2: Homepage + cards

- [ ] `GET /api/v1/home/marketplace-preview` wired
- [ ] Home page consumes it; cards show `isTop` badge **Top**
- [ ] i18n titles: Top bikes / Top parts

### Task 3: Seller promote flow

- [ ] Promote pages + form (packages → bank → slip → WhatsApp button)
- [ ] My listings / my parts: Promote link + pending/live/rejected status

### Task 4: Admin Homepage ads

- [ ] Requests / Live / Settings tabs
- [ ] Slip preview (image inline, PDF new tab via auth blob)
- [ ] Approve/reject, override place, package + bank CRUD
- [ ] Sidebar badge from `pendingPromoRequests`

### Task 5: Verify

- [ ] API unit tests pass
- [ ] Browser: homepage fill, promote form, admin queue
