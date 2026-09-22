# Task 8 Report: Parts shop detail page

## Status
**Complete**

## Summary
Added admin parts shop detail route and component. The page loads shop profile (cover, owner, contact, location, description, status/verified badges, parts count and per-status chips) and a paginated inventory table filtered by `partsDealerId`.

## Changes

### `apps/web/src/components/admin/admin-parts-dealer-detail.tsx`
- Loads shop via `GET /api/v1/admin/parts-dealers/:id`
- Loads inventory via `GET /api/v1/admin/part-listings?partsDealerId=:id&limit=20&page=…`
- Actions: Back to parts shops, Public view (`/parts-dealers/{slug}`), Add part (`/admin/part-listings?partsDealerId={id}`)
- Inventory row actions: View public part URL by kind; Edit in Part listings with `partsDealerId` + `q=title`
- Reuses admin-card, badge tones, table, and Pagination patterns

### `apps/web/src/app/[locale]/admin/parts-dealers/[id]/page.tsx`
- Client page wrapping `AdminPartsDealerDetail` with route `id` param

## Commit
- **Hash:** `7aa96d2`
- **Message:** `Add admin parts shop detail with inventory view.`
- **Files staged:** the two new files only

## Verification
- No linter errors on new files
- Manual smoke not run in this session (requires logged-in admin + API on 3001)

## Concerns
- “Add part” navigates to Part listings with shop filter preselected; create modal does not auto-open (Task 6 only reads `partsDealerId` for filter/default, not auto-create).
- “Edit in Part listings” uses title search (`q=`) as MVP; may match multiple rows if titles duplicate.
- Detail page does not expose inline shop edit/delete (list page modal remains the edit path).

## Follow-up fix
- **Issue:** Shop detail “Edit” links to `/admin/part-listings?partsDealerId=X&q=TITLE`, but `useAdminSearch` resets on navigation so the topbar search stayed empty.
- **Fix:** `part-listings/page.tsx` seeds `setSearch(q)` from URL `q` on mount/param change (runs after layout pathname reset).
- **Commit:** `Seed admin part listings search from URL q param.`
