# Promo tiers: Boost / Featured / Premium

**Date:** 2026-09-29  
**Status:** Approved for planning  
**Context:** Promotions today are homepage-only (`promo_packages` = name/price/days; `homepage_placements` = single surface). Product needs three admin-configurable tiers with different surfaces and priority for bikes **and** parts.

## Goal

Let admins fully control Boost / Featured / Premium packages (price, duration, surfaces, priority). Sellers buy a package; public surfaces show promoted inventory accordingly: Marketplace Home Top Ads, browse Promoted rails (`/bikes` + parts browse), and listing/part detail sponsored rows. Premium outranks Featured outranks Boost.

## Decisions (locked)

- **Scope:** Bikes + parts, same tier model.
- **Bike/parts “page” surfaces:** both **browse** (`/bikes`, parts browse) **and** **detail** (`/bikes/[slug]`, part detail).
- **Architecture:** Approach A — package-level `tier`, `surfaces[]`, `priority`; placements inherit package surfaces at approve time (snapshot on placement for stable serving if package later edits).
- **Out of scope (v1):** Hero static showcase as paid inventory; category-landing-specific rails (browse rail covers category filter pages if they reuse the same browse component — include when cheap); auction/bidding for slots; automatic renewals.

## Current state

| Piece | Today |
|-------|--------|
| Package | `kind`, `name`, `durationDays`, `priceLkr`, `sortOrder`, `isActive` |
| Placement | Homepage only; order ≈ `startsAt DESC` |
| Home | Top ads from live placements |
| Browse | Optional `featured=true` filter only; no Promoted section |
| Detail | No promoted row |
| Admin | Packages create + toggle; no surface/priority/tier fields |

## Design

### 1. Data model

**`promo_packages` add:**

| Field | Type | Notes |
|-------|------|--------|
| `tier` | enum `boost` \| `featured` \| `premium` | Required |
| `surfaces` | text[] or jsonb | Subset of `home`, `browse`, `detail` |
| `priority` | int | Higher wins (defaults: boost 10, featured 20, premium 30) |

Keep `name`, `priceLkr`, `durationDays`, `kind`, `isActive`, `sortOrder` — all admin-editable.

**`homepage_placements` (or rename conceptually to `promo_placements` — prefer keep table name to limit migration risk) add:**

| Field | Notes |
|-------|--------|
| `tier` | Snapshot from package at create |
| `surfaces` | Snapshot from package |
| `priority` | Snapshot from package |

Serving queries filter `surfaces @> '{home}'` (or equivalent) and `ORDER BY priority DESC, startsAt DESC`.

**Migration:** alter columns + backfill existing packages as `featured` with surfaces `{home,browse,detail}` priority 20 (preserve current “homepage ad” behavior). Existing placements same snapshot.

**Seed / admin defaults (editable):**

| Tier | Surfaces | Priority | Example price/days |
|------|----------|----------|--------------------|
| Boost | browse, detail | 10 | 500 / 7 |
| Featured | home, browse, detail | 20 | 1000 / 7 |
| Premium | home, browse, detail | 30 | 2000 / 14 |

Create bike + part package rows for each tier when missing (idempotent seed or admin “ensure defaults” — prefer migration seed or one-time script invoked from docs; admin can still edit).

### 2. Validation & API

- Zod: tier enum; surfaces non-empty array of allowed values; priority 0–1000; existing price/days rules.
- Admin package POST/PATCH accept new fields; GET returns them.
- Seller `GET packages` returns tier, surfaces, priority for UI cards.
- Approve / manual place: copy package tier/surfaces/priority onto placement.
- Public endpoints:
  - Home preview: filter home surface; sort priority.
  - `GET /promotions/live?surface=browse|detail&kind=bike|part&limit=` (or fold into listings): live placements for surface.
  - Listings browse: optional promoted rail data (separate endpoint preferred so main grid query stays clean).

### 3. Admin UI (`admin-homepage-ads` Settings / Packages)

- Package form: name, kind, **tier select**, **surface checkboxes** (Home / Browse / Detail), priority, price, days, active.
- List shows tier badge + surface chips.
- Requests + Live: show tier badge; manual place requires choosing an active package (inherits surfaces) or explicit tier for override.
- Rename nav label optionally to **Promotions** (keep route `homepage-ads` or alias — prefer keep URL, update titles/copy).

### 4. Seller promote form

- Package cards: tier name, price, days, checklist of surfaces (“Marketplace home”, “Browse promoted”, “Listing page”).
- Copy: not only “homepage”; use tier-aware subtitle.

### 5. Public surfaces

1. **Marketplace home Top Ads** — only placements with `home`; Premium first.
2. **`/bikes` + parts browse** — “Promoted” section above main grid (cards with Boost/Featured/Premium badge or shared “Promoted”); does not remove them from organic grid unless already filtered (v1: rail only; organic sort unchanged).
3. **Bike + part detail** — “Promoted” horizontal row (exclude current listing); same priority sort.

Caps: sensible limits (e.g. home fill as today; browse rail ≤ 8; detail ≤ 6) — configurable later via settings if easy; else constants.

### 6. Testing

- Unit: surface filter + priority order.
- Service: Boost not returned for home; Premium before Featured on home.
- Manual: admin edit surfaces → new approve respects; old placement keeps snapshot.

## Success criteria

1. Admin can create/edit Boost/Featured/Premium with surfaces and priority.
2. Boost never appears on Marketplace Home Top Ads.
3. Featured + Premium appear on Home, browse Promoted, and detail Promoted; Premium ranks above Featured.
4. Bikes and parts both supported.
5. Existing live homepage placements keep working after migration backfill.
