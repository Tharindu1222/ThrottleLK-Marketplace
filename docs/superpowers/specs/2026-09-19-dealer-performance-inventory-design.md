# Dealer performance & inventory — design

**Date:** 2026-09-19  
**Status:** Approved for implementation (pending user review of this file)

## Goal

Dealers get a **Performance** account page (totals with time filters) and **private inventory** fields so they can track stock cost, days in stock, sold price, and margin — without exposing that data to buyers.

## Decisions

| Topic | Choice |
|--------|--------|
| Surfaces | New **Performance** page for totals; inventory on dealer create/edit + My listings / sold dialog |
| Audience | **Dealers only**; private sellers unchanged |
| Mark sold | Dialog: **sold price required**, sold date optional (default now) |
| Cost / purchase date | **Optional**; margin / days-in-stock only when data exists |
| Performance range | **All time / Last 7 days / Last 30 days** |
| Views in range | **Filterable** — log view events (keep lifetime `viewCount` too) |
| Architecture | Denormalized counters on `Listing` + event rows for ranged aggregates |

## Scope

### In scope

**Dealer Performance** (`/account/performance`)

- Nav item **Performance** (dealer-only), near Showroom / My listings
- Metrics:
  - Total **active** listings (always current stock; not date-filtered)
  - Total **views** (respects range)
  - **Phone** clicks (respects range)
  - **WhatsApp** clicks (respects range)
  - **Saved / favourite** count (respects range)
- Range tabs: All time | Last 7 days | Last 30 days
- Zero states show `0`; no charts in v1

**Inventory management** (dealer owner only)

- Optional **purchase date**, **cost price** (private)
- **Selling price** = existing public `priceLkr`
- **Days in stock** derived: from `purchaseDate` if set, else `publishedAt` (fallback created)
- **Sold price** + **sold date** via mark-sold dialog
- **Profit / margin** (owner-only): if `costPriceLkr` and `soldPriceLkr` exist → `soldPriceLkr - costPriceLkr` (and percent vs cost). For unsold stock with cost set, optional **potential margin** vs asking `priceLkr` on owner views only.

### Out of scope

Charts, CSV export, per-listing performance table, lead CRM, dealer comparisons, email digests, KYC. Editing sold price after mark-sold can be a follow-up (not required for v1).

## Data model

### `Listing` — new columns

| Column | Type | Notes |
|--------|------|--------|
| `costPriceLkr` | int, nullable | Owner-only |
| `purchaseDate` | date, nullable | Owner-only |
| `soldPriceLkr` | int, nullable | Set on mark-sold; owner-only |
| `phoneClickCount` | int, default 0 | Lifetime |
| `whatsappClickCount` | int, default 0 | Lifetime |

Reuse: `priceLkr`, `viewCount`, `soldAt`, `status`, `publishedAt`, `createdAt`.

### Events (ranged metrics)

**`listing_engagement_events`**

| Column | Notes |
|--------|--------|
| `id` | PK |
| `listingId` | FK → listings |
| `type` | `view` \| `phone` \| `whatsapp` |
| `createdAt` | for range filters |

- View path: keep incrementing `viewCount` **and** insert `view` event.
- Contact click: increment `phoneClickCount` / `whatsappClickCount` **and** insert event.
- Favourites in range: `COUNT` from existing `favourites` where `createdAt` in window (no new favourite events table).

### Serialization / privacy

- **Public** browse/detail: never expose `costPriceLkr`, `purchaseDate`, `soldPriceLkr`, click counters, or margin.
- **Owner** (`listMine`, get-own, Performance): inventory fields, lifetime counters, `favouriteCount`, derived `daysInStock`, `marginLkr` / `marginPercent` when computable.
- Contact-click events store **no buyer PII**.

## API

### Performance

`GET /api/v1/dealers/mine/performance?range=all|7d|30d`

- Auth: dealer owner only → else 403.
- Response shape (illustrative):

```json
{
  "range": "7d",
  "activeListings": 4,
  "views": 120,
  "phoneClicks": 18,
  "whatsappClicks": 25,
  "favourites": 9
}
```

### Contact clicks

`POST /api/v1/listings/:id/contact-clicks` body `{ "type": "phone" | "whatsapp" }`

- Rate-limited; auth optional (same spirit as views).
- Skip seller’s own clicks when the caller is identifiable as the owner.
- Non-active listing → **404**.
- Wire **listing detail** Call / WhatsApp actions to fire this before `tel:` / `wa.me` navigation. Dealer showroom profile Call/WA (shop-level, not per listing) is **out of scope** for v1 click attribution.

### Inventory on create/update

- Dealer create/update accepts optional `costPriceLkr`, `purchaseDate`.
- Non-dealers: ignore or reject these fields (prefer ignore for forward-compatible clients).

### Mark sold

`POST /api/v1/listings/:id/mark-sold` body:

```json
{ "soldPriceLkr": 1900000, "soldAt": "2026-09-18" }
```

- `soldPriceLkr` **required** (400 if missing).
- `soldAt` optional; default now.
- Sets `status = sold`, `soldAt`, `soldPriceLkr` (existing transition rules from active/paused unchanged).

## UI

### Account

- Sidebar: **Performance** with `dealerOnly: true`.
- Page: title, short subtitle, range control, metric grid.

### Sell / edit (dealer)

- Optional fields: purchase date, cost price (clearly labeled private / not shown publicly).

### My listings (dealer)

- Cards may show owner metrics: views, phone/WA clicks, favourites; optional private hints (days in stock, cost) without cluttering public card component — use owner-only props/layout branch.
- **Sold** → modal: sold price (required), sold date (optional).

### i18n

Add en + si keys for nav label, metric labels, inventory labels, sold dialog, privacy helper text.

## Errors & edge cases

| Case | Behavior |
|------|----------|
| Mark sold without sold price | 400 |
| Non-dealer → Performance | 403 / hide nav |
| Missing cost | Hide margin |
| Missing purchase date | Days in stock from `publishedAt` / created |
| Own view or own contact click | Do not count when identifiable |

## Testing (implementation plan will detail)

- Performance aggregates for `all` / `7d` / `30d` with seeded events and favourites.
- Privacy: public DTO never includes inventory fields.
- Mark-sold validation and dialog → API contract.
- Contact-click increments + event insert; rate limit smoke.
- Dealer-only gating on nav and API.

## Success criteria

- Dealer can open Performance and see the five metrics with working range tabs.
- Dealer can optionally set cost / purchase date; buyers never see them.
- Mark sold collects sold price (and optional date); margin visible to dealer when cost exists.
- Phone/WhatsApp clicks and views contribute to Performance ranges.
