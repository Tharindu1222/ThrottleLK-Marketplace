# Homepage Top Ads — paid placements

**Date:** 2026-09-25  
**Status:** Approved for planning  
**Context:** The homepage “Latest bikes” / “Latest parts” blocks show the newest 8 items. There is no way to feature a listing, no promotion request, and no payment collection. Product spec already lists featured listings and homepage advertising as future monetization.

## Goal

Sellers can pay to put an active bike or part listing at the front of the homepage preview. They pick an admin-defined package, see the bank account, upload a payment slip (image or PDF), and optionally message WhatsApp. Admin reviews the slip, approves or rejects, and can override placements without a request. Homepage stays full: paid ads first, newest listings fill remaining slots.

## Decisions (locked)

- **Flow:** Seller request → package → bank details → slip upload → admin approve. WhatsApp is an optional button, not required to submit.
- **Catalog:** Bikes and parts both. Separate package lists.
- **Duration:** Admin-managed packages (name, days, LKR price).
- **Homepage mix:** One bikes section and one parts section. Active paid placements first, then newest active listings. Max 8 each. No second “Latest” block.
- **Payment:** No gateway. Bank transfer + slip. Admin confirms.
- **Slip file:** JPEG, PNG, WebP, or PDF. One file per request. Max 5MB.
- **Override:** Admin can place, extend, shorten, or remove a listing without a seller request.
- **Architecture:** Approach 2 — packages, bank accounts, promotion requests, and homepage placements as separate tables. Do not add a `featuredUntil` flag on `listings` / `part_listings`.

## Out of scope

- PayHere or any card/online checkout
- Boosting browse/search rank
- Urgent badges, dealer subscription packages, brand ads
- Word/Excel slip uploads
- Changing the hero showcase bikes
- Automatic WhatsApp Business API messages

## Current state

| Area | Today |
|------|--------|
| Homepage preview | `/api/v1/listings?limit=8&sort=newest` plus spare + modified parts interleaved to 8 |
| Listing / part entities | No featured or placement fields |
| Admin | Listings, parts, dealers, taxonomy, moderation — no ads section |
| Payments | None |
| Storage | Public object storage for listing images (R2). Slips must not use a public URL. |

## Design

### 1. Data model

Four tables. Soft-disable packages and bank accounts; do not hard-delete rows that requests already reference.

#### `promo_packages`

| Column | Notes |
|--------|--------|
| `id` | UUID |
| `kind` | `bike` or `part` |
| `name` | e.g. “7 days” |
| `duration_days` | Integer, 1–365 |
| `price_lkr` | Integer, ≥ 0 |
| `sort_order` | Seller list order |
| `is_active` | Inactive packages hidden from sellers |
| `created_at`, `updated_at` | |

#### `promo_bank_accounts`

| Column | Notes |
|--------|--------|
| `id` | UUID |
| `bank_name` | |
| `account_name` | |
| `account_number` | |
| `branch` | Nullable |
| `is_default` | At most one default. Seller sees the default. |
| `is_active` | Inactive accounts hidden from sellers |
| `created_at`, `updated_at` | |

Making an account default unsets the previous default in the same transaction.

#### `promo_settings` (single row)

| Column | Notes |
|--------|--------|
| `id` | Constant `default` |
| `whatsapp` | Business number for the seller WhatsApp button. Empty → hide the button. |
| `updated_at` | |

#### `promo_requests`

| Column | Notes |
|--------|--------|
| `id` | UUID |
| `seller_id` | Owner |
| `subject_type` | `bike` or `part` |
| `listing_id` | Bike listing, null for parts |
| `part_listing_id` | Part listing, null for bikes |
| `package_id` | Snapshot of the chosen package via FK |
| `bank_account_id` | The account shown at request time |
| `slip_storage_key` | Private object key |
| `slip_content_type` | `image/jpeg`, `image/png`, `image/webp`, or `application/pdf` |
| `slip_original_name` | Original filename for admin download |
| `status` | `pending`, `approved`, `rejected` |
| `rejection_reason` | Required when rejected |
| `reviewed_by_id` | Admin user, null until reviewed |
| `reviewed_at` | |
| `created_at`, `updated_at` | |

Exactly one of `listing_id` / `part_listing_id` is set. A listing may have at most one `pending` request. A listing may have at most one **live** placement (see below). While either exists, the seller cannot submit another request.

#### `homepage_placements`

| Column | Notes |
|--------|--------|
| `id` | UUID |
| `request_id` | Null when created by admin override |
| `source` | `request` or `admin_override` |
| `subject_type` | `bike` or `part` |
| `listing_id` / `part_listing_id` | Same exclusivity as requests |
| `starts_at` | Approve time or admin place time |
| `ends_at` | `starts_at + package.duration_days`, or admin-chosen end |
| `created_at`, `updated_at` | |

A placement is **live** when `ends_at > now()` and the linked listing/part status is `active`. Sold, paused, rejected, expired, or deleted listings drop off the homepage immediately even if `ends_at` is in the future. No cron job is required; the homepage query filters live rows.

No seed packages or bank accounts. Empty seller state: “Homepage ads are not available yet.”

### 2. Seller flow

Entry: **Promote** on an `active` bike from `/{locale}/account/listings` and on an `active` part from `/{locale}/account/parts-listings`. Hidden for every other status.

Dedicated pages:

- `/{locale}/account/listings/{id}/promote`
- `/{locale}/account/parts-listings/{id}/promote`

Three steps on one page (progress visible):

1. **Packages** — active packages for that `kind`, showing name, days, price LKR. If none, show the empty copy and no continue.
2. **Pay** — after a package is selected, show the default bank account (bank, account name, number, branch). Copy amount to pay from the package price.
3. **Slip** — file input accepting JPEG, PNG, WebP, PDF. Submit creates a `pending` request.

Optional **Send WhatsApp** button after step 2 if `promo_settings.whatsapp` is set. Normalize to digits only; if the number starts with `0`, rewrite as `94` + the rest (Sri Lanka). Opens `https://wa.me/{digits}` with a pre-filled message: listing title, package name, days, price. Does not submit the request.

Listing card / row status after submit:

| State | Copy |
|-------|------|
| Pending | Pending homepage review |
| Live | On homepage until {date} |
| Rejected | Homepage request rejected: {reason}. Promote available again. |
| Pending or live | Promote disabled |

Owner can replace the slip while status is `pending` (same request, new file, old object deleted).

### 3. Admin

New sidebar item under Manage: **Homepage ads** → `/{locale}/admin/homepage-ads`.

Three tabs:

**Requests** — pending first. Each row: subject type, thumbnail, title, seller, package, amount, submitted time, **View slip**. Slip opens in a panel: images inline; PDFs via authenticated blob in a new tab or embedded viewer. Approve creates a placement (`starts_at = now`, `ends_at = now + package.duration_days`) and notifies the seller. Reject requires a reason and notifies the seller. Sidebar badge shows pending request count (same pattern as moderation/reports).

**Live** — current live placements with end date. Actions: change `ends_at`, **Remove now** (set `ends_at = now`). **Add manually**: search active bikes or parts by title, set duration days or an end date, create `source = admin_override`. If that listing already has a live placement, update `ends_at` instead of inserting a second row. If that listing has a pending request, auto-reject it with reason “Placed by admin.”

**Settings** — bike packages and part packages (add / edit / disable; name, days, price, sort). Bank accounts (add / edit / disable; set default). WhatsApp business number.

Admin cannot delete a package or bank account that is referenced by a request; disable instead.

### 4. Homepage

Replace “Latest bikes” / “Latest parts” labels with **Top bikes** / **Top parts** (EN + SI). Same grid, cards, browse links, empty states.

Public endpoint `GET /api/v1/home/marketplace-preview` returns `{ bikes, parts }` (max 8 each):

1. Live placements for that subject type, newest `starts_at` first.
2. Fill with newest active items not already included.
3. Parts fill still interleaves spare + modified after featured part placements, same as today’s `pickPreviewItems` intent.

Each card includes `isTop: true` only when it came from a live placement. `ListingCard` / `PartCard` show a text badge **Top** (not color-only). Favourite stays off on the homepage.

Home page (`/{locale}`) calls this endpoint instead of the current newest-only fetches for the preview sections. Browse pages stay newest/filter sort — no rank boost.

### 5. API surface

Seller (JWT, owner only):

- `GET /api/v1/promotions/packages?kind=bike|part`
- `GET /api/v1/promotions/payment-info` — default bank + WhatsApp
- `GET /api/v1/promotions/requests?listingId=` or `partListingId=` — latest request + live placement for that item
- `POST /api/v1/promotions/requests` — multipart: packageId, listingId or partListingId, slip file
- `PATCH /api/v1/promotions/requests/:id/slip` — replace slip while pending

Admin (JWT + admin role):

- CRUD packages, bank accounts, settings
- List/filter requests; stream slip (`GET .../requests/:id/slip`)
- Approve / reject
- List live placements; patch end date; end now; create override

Public:

- `GET /api/v1/home/marketplace-preview`

Slip objects live under `promo-slips/{requestId}/{uuid}.{ext}` and are served only through the authenticated admin slip route. Sellers do not re-fetch the file after upload. Do not store a public `slip_image_url`.

### 6. Notifications

Reuse `NotificationsService.notifyUser`:

- Approve: type `promo_approved` — listing is on the homepage until {date}
- Reject: type `promo_rejected` — include reason

In-app + existing email path, same as listing approval.

### 7. Validation and errors

- Promote only if listing/part is `active` and owned by the caller.
- Reject submit without a slip, with a wrong MIME type, or over 5MB.
- Reject a second request while pending or live.
- Seller payment-info with no default bank: show “Contact us on WhatsApp” if a number exists; otherwise “Homepage ads are not available yet.” Do not accept a request without a default bank account.
- Approve fails if the listing is no longer `active`.
- Admin reject without a reason fails.

### 8. i18n and accessibility

All seller and homepage strings in `en` and `si`. Admin UI stays English, matching the rest of admin.

Promote file input has a visible label (“Payment slip”) and accepted-types hint. Step headings are real headings. WhatsApp is a link/button with an accessible name, not icon-only. Homepage **Top** badge includes visible text. Pending/live status is text, not color alone.

### 9. Testing

API unit tests:

- Submit request happy path; duplicate pending/live blocked
- Approve creates placement with correct `ends_at`
- Reject requires reason; seller can request again
- Homepage preview orders live placements first and fills to 8 without duplicates
- Sold/paused listing excluded even with a future `ends_at`
- Admin override updates existing live placement; pending request auto-rejected
- Slip MIME allow-list (PDF + images); reject other types
- Slip route is not public

Web: homepage still renders 8 cards when fewer than 8 placements exist (uses newest fill). Empty marketplace still uses existing empty copy.

## Risks

- Slip files contain bank details — private storage and auth on the slip route are required.
- Without a default bank account or packages, sellers cannot promote; Settings empty states must say that.
- Clock/expiry is query-time; a placement that just expired disappears on the next homepage load.
