# Admin part listings & parts shop detail

**Date:** 2026-09-22  
**Status:** Approved for planning  
**Context:** Admin already has full CRUD for bike listings and parts shops. Part listings only appear in Moderation (approve/reject). Parts shops list has no inventory count or drill-in detail page.

## Goal

Give admins parity with bike listings for spare/modified parts, and let them open a parts shop to see profile details plus every part listed under that shop.

## Decisions (locked)

- **Scope:** Option A — full admin CRUD for part listings (create / edit / status / delete / images).
- **Architecture:** Approach 1 — dedicated Part listings manage page + enhance Parts shops list/detail (mirror bike admin patterns).
- **Out of scope:** Public marketplace UX changes, payments, owner-account parts UI rewrites, Moderation queue redesign (keep existing pending approve/reject).

## Current state

| Area | Today |
|------|--------|
| `/admin/listings` | Full bike listing CRUD |
| `/admin/parts-dealers` | Shop CRUD only; no parts count; no detail route |
| `/admin/part-listings` | Missing |
| API `admin/part-listings` | Pending list + approve/reject + images only |
| Moderation | Pending part listings + pending parts dealers |

## Design

### 1. Sidebar & shell

- Add **Part listings** under Manage (after **Listings**, before **Dealer shops** or after **Parts shops** — prefer after Listings for inventory grouping: Listings → Part listings → Dealer shops → Parts shops → …).
- Route: `/{locale}/admin/part-listings`.
- Wire topbar title + search placeholder in `admin-layout-client` for `part-listings` and `parts-dealers/[id]`.

### 2. Part listings manage page

Mirror `AdminListings` UX:

- Filters: status (`All` + same statuses as part listing entity), optional kind (`spare` | `modified`).
- Topbar `q` search (title, shop name).
- Paginated table (limit 20).
- Columns: Title (thumb + kind badge), Shop, Price, Status (inline select), Updated, Actions.
- Actions: View (public spare/modified URL by kind+slug), Edit, Delete (confirm; soft-delete or hard-delete — match part-listings service owner semantics / bike admin if soft).
- “+ New part listing” opens editor modal.

**Editor fields**

- Parts dealer (required shop select)
- Part category
- Kind: spare | modified
- Title, description
- Price (LKR), negotiable if supported by schema
- Condition / other fields already on `createPartListingSchema`
- District/city if on schema
- Status
- Fitments: one or more brandId + optional modelId (reuse account parts editor patterns where possible)
- After save: image manager (reuse admin part-listing image endpoints already on controller)

**Empty / error states:** Same admin card / muted copy style as listings.

### 3. Parts shops list enhancements

In `AdminPartsDealers` table:

- Add **Parts** column: `partsCount` (number of part listings for that shop; exclude deleted if soft-delete exists).
- Add **Open** (or make shop name a link) → `/{locale}/admin/parts-dealers/{id}`.
- Keep existing Edit / Delete on the list.

### 4. Parts shop detail page

Route: `/{locale}/admin/parts-dealers/[id]`.

**Top section**

- Shop name, status, verified badge, owner, phone/email, location, address, description, cover image.
- Summary chips: total parts, counts by status (optional but useful: active / pending_review / draft).
- Actions: Edit (open existing editor or navigate back with edit), View public shop (`/parts-dealers/{slug}`), Back to Parts shops.

**Inventory section**

- Table of that shop’s part listings (same columns as Part listings page, filtered by `partsDealerId`).
- “+ Add part” → Part listings create flow with `partsDealerId` prefilled (query `?partsDealerId=` on `/admin/part-listings` or open modal on detail page).
- Inline status / edit / delete can deep-link to Part listings editor or embed the same modal component.

### 5. API

Extend admin part-listings beyond pending-only:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/part-listings` | Paginated list: `page`, `limit`, `q`, `status`, `kind`, `partsDealerId` |
| `GET` | `/admin/part-listings/:id` | Detail with fitments + images meta |
| `POST` | `/admin/part-listings` | Admin create (assign any shop; set status) |
| `PATCH` | `/admin/part-listings/:id` | Admin update including status |
| `DELETE` | `/admin/part-listings/:id` | Admin delete |
| Existing | pending / approve / reject / images | Unchanged |

Parts dealers:

| Change | Detail |
|--------|--------|
| List/detail payload | Include `partsCount` (and optionally status breakdown on detail) |
| `GET /admin/parts-dealers/:id` | Ensure returns full shop + cover (already `adminGet`); add counts |

Validation: prefer admin-specific Zod schemas if owner create schemas omit status or force draft; otherwise extend create/update with optional admin status and fitments array matching existing owner API.

Dashboard: `pendingPartListings` already counted; no change required unless list filters need new indexes (existing status/kind indexes should suffice).

### 6. Types (web)

- Extend `admin-types.ts` with `AdminPartListing` row type (id, title, slug, kind, priceLkr, status, updatedAt, coverImageUrl, partsDealer, …).
- Parts dealer row: add `partsCount: number`.

### 7. Notifications / moderation

- Creating via admin as `active` may skip pending notify; creating as `pending_review` should keep `partListingPendingReview` behavior consistent with owner submit.
- Moderation page stays the queue for non-admin submits; no need to hide admin-created pending rows.

## Non-goals

- Merging bike and part listings into one table.
- Changing public catalog routes.
- Bulk import / CSV.
- Admin chat or reports for parts (unless already shared).

## Success criteria

1. Admin can list, create, edit, change status, manage images, and delete part listings from `/admin/part-listings`.
2. Parts shops table shows how many parts each shop has.
3. Opening a parts shop shows full shop details and its full inventory; admin can add/edit parts from that context.
4. Existing Moderation approve/reject for part listings and parts dealers still works.
5. Sidebar + topbar search work for the new routes.

## Implementation notes

- Prefer extracting shared table/editor pieces only if duplication becomes painful; first ship by cloning `admin-listings.tsx` / `admin-parts-dealers.tsx` patterns (same as bike ↔ parts dealers mirror).
- Public View links: spare → `/{locale}/spare-parts/{slug}`, modified → `/{locale}/modified-parts/{slug}`.
- After API changes, rebuild/restart Nest (`nest start` does not watch).
