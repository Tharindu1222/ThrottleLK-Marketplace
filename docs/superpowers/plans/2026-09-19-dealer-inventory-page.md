# Dealer Inventory Page Implementation Plan

> **For agentic workers:** Execute task-by-task. Checkboxes for tracking.

**Goal:** Dealer Inventory page with hybrid listed/unlisted stock, private financial fields, and document uploads with expiry warnings.

**Architecture:** `dealer_inventory_items` (+ optional `listingId`) and `inventory_documents`; dealer-gated APIs; account UI table.

**Tech Stack:** NestJS/TypeORM, Zod, R2 uploads, Next.js account shell.

## Global Constraints

- Dealers only; inventory + docs never public.
- Unlisted create: title required; brand/model/year optional.
- Expiry required for insurance & revenue_license; ownership_cr has no expiry.
- Warn: expired / within 30 days.
- All statuses in one table.

---

### Task 1: Schema + validation

- Migration `1726800000000-AddDealerInventory.ts`
- Entities: `DealerInventoryItem`, `InventoryDocument`
- Zod: create/update inventory, mark-sold (reuse), document type enum
- Register in `DealersModule`

### Task 2: Inventory service + API

- `InventoryService`: list (with backfill), create, update, markSold, upload/delete doc, serialize with days/margin/doc statuses
- Controller routes under `dealers/mine/inventory`
- Unit tests for create/list/expiry helper/markSold

### Task 3: Listing upsert hook

- On dealer listing `create` (and update title/price): `inventory.upsertFromListing`
- Preserve existing cost/purchase/docs

### Task 4: Web Inventory UI

- Sidebar + i18n
- `/account/inventory` page + client (table, add, edit panel, docs upload, mark sold)
- Use `apiUpload` with FormData field `expiresAt` (extend helper if needed)

### Task 5: Migrate + smoke

- `migration:run`, API tests, restart check
