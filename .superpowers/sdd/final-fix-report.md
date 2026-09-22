# Final review fixes — feature/admin-part-listings-shop-detail

## Fix 1 — Validate partsDealerId on admin create/update

**Files:** `apps/api/src/part-listings/part-listings.service.ts`, `part-listings.admin.spec.ts`

- `adminCreate` and `adminUpdate` call `partsDealersService.adminGet()` before persisting.
- Missing dealer throws `NotFoundException` with code `PARTS_DEALER_NOT_FOUND` (from `PartsDealersService.adminGet`).
- Tests added: validates on create, throws when missing, validates on update when changing shop.

## Fix 2 — Part listing approve/reject notifications

**Files:** `part-listings.service.ts`, `notifications.service.ts`, `notifications-bell.tsx`

- Added `partListingApproved` / `partListingRejected` notification helpers with `partListingId`, `slug`, `kind` in data.
- `approve()` / `reject()` now use these instead of bike `listingApproved` / `listingRejected`.
- Owner resolved via `partsDealersService.adminGet()` for reliable `ownerUserId`.
- `notificationHref` explicitly routes `part_listing_approved` / `part_listing_rejected` to `/spare-parts/{slug}` or `/modified-parts/{slug}` by kind.

## Test commands and output

```bash
cd apps/api && npx jest part-listings.admin.spec.ts parts-dealers.admin.spec.ts
```

```
PASS src/parts-dealers/parts-dealers.admin.spec.ts (5.573 s)
PASS src/part-listings/part-listings.admin.spec.ts (7.65 s)

Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        8.454 s
```

## Commits

1. `acb598b` — fix(api): validate partsDealerId on admin part listing create/update
2. `ee61f6a` — fix(api,web): part listing approve/reject notifications deep-link correctly
