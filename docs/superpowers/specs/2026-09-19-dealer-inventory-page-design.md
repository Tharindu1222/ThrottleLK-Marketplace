# Dealer inventory page — design

**Date:** 2026-09-19  
**Status:** Approved for implementation

## Goal

Dealers get a dedicated **Inventory** account page for **all stock**: marketplace listings **and** unlisted private bikes, with private cost/purchase/sold fields and document uploads (insurance, revenue license, ownership/CR book). Insurance and revenue license support **expiry dates** with expire / expiring-soon warnings.

## Decisions

| Topic | Choice |
|--------|--------|
| Surface | Separate `/account/inventory` page + sidebar (dealer-only) |
| Stock set | Hybrid: listed + unlisted in one table |
| Unlisted create | Minimal: title required; brand/model/year optional |
| Table rows | All statuses (listing status when linked; else `in_stock` / `sold`) |
| Documents | Insurance, revenue license, ownership/CR; upload + expiry on insurance & revenue license |
| Warn | Expired if past today; expiring soon within **30 days** |
| Architecture | `dealer_inventory_items` with optional `listingId` + `inventory_documents` |

## Data model

### `dealer_inventory_items`

- `id`, `dealerId`, `ownerUserId`
- `title` (required)
- `brandName`, `modelName`, `manufactureYear` (optional)
- `purchaseDate`, `costPriceLkr`, `askingPriceLkr` (optional)
- `soldPriceLkr`, `soldAt` (optional)
- `listingId` (nullable, unique when set)
- timestamps

**Status display:** if `listingId` → listing.status; else `sold` if `soldAt` else `in_stock`.

**Days in stock:** from `purchaseDate` else `createdAt`, until `soldAt` or now.

**Margin:** when cost set — vs sold price if sold, else asking (inventory asking or linked listing price).

### `inventory_documents`

- `inventoryItemId`, `type` (`insurance` | `revenue_license` | `ownership_cr`)
- `fileUrl`, `storageKey`, `fileName`, `mimeType`
- `expiresAt` (required for insurance & revenue_license; null for ownership_cr)
- Unique `(inventoryItemId, type)` — replace overwrites

## Sync

- Dealer listing create/update with `dealerId`: upsert linked inventory row (title/asking from listing; preserve cost/docs).
- Inventory list: backfill any dealer listings missing a linked row.
- Mark sold on inventory: set sold fields; if linked listing is active/paused, mark listing sold too.

## API (JWT, active dealer owner)

- `GET /dealers/mine/inventory`
- `POST /dealers/mine/inventory`
- `PATCH /dealers/mine/inventory/:id`
- `POST /dealers/mine/inventory/:id/mark-sold`
- `POST /dealers/mine/inventory/:id/documents/:type` (multipart file + optional `expiresAt`)
- `DELETE /dealers/mine/inventory/:id/documents/:type`

Never expose inventory/docs on public listing DTOs.

## UI

- Sidebar **Inventory** after Performance
- Table + Add bike + row edit / docs / mark sold / open listing
- Doc indicators: missing / ok / expiring / expired
- Detail drawer or inline panel for fields + three doc slots

## Out of scope

Email/SMS expiry reminders, CSV, charts, buyer-facing docs, rich “post as listing” prefill wizard (optional deep-link to `/sell` only).
