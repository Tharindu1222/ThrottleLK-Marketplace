# Verified dealer badge — design

**Date:** 2026-09-19  
**Status:** Approved for implementation

## Goal

Admins can grant or revoke a **Verified** badge on dealer shops, independent of active status. Buyers see the badge on showroom, directory, map, and listing surfaces.

## Rules

- **Verified** means `verifiedAt != null`.
- Public badge only when dealer is **active** and verified.
- Admin sets verification; approving / activating a dealer does **not** auto-verify.
- When status leaves `active` (reject, suspend, etc.), clear `verifiedAt` so badge cannot linger.
- Existing dealers: one-time migration sets `verified_at = NULL` (admin must re-verify).

## Data model

Reuse existing `dealers.verified_at` (`verifiedAt`). No new column.

- Toggle on → `verifiedAt = now()`
- Toggle off → `verifiedAt = null`
- Stop setting `verifiedAt` in approve / status→active paths.

## Admin UX

- **Dealer shops** table: Verified indicator next to shop name; Verified on/off control (enabled only when status is `active`).
- **Edit / New dealer** form: Verified checkbox/toggle (same rule: only meaningful for active).
- Creating a dealer as active still starts **unverified** unless admin explicitly checks Verified.

## API

- Admin create/update accepts `verified: boolean` (optional).
  - `true` only allowed when resulting status is `active`; sets `verifiedAt`.
  - `false` or status not active → `verifiedAt = null`.
- Public dealer list / detail / map DTOs continue to expose `verifiedAt` (or derive `verified: boolean` for clients).
- Listing list + detail DTOs add `dealerVerified: boolean` — `true` only if linked dealer is active and has `verifiedAt`.

## Public UI

Shared badge: checkmark + label (`Verified` / `සත්‍යාපිත`), next to shop or seller name (not overlaid on photos).

| Surface | Behavior |
|--------|----------|
| Showroom `/dealers/[slug]` | Badge beside shop name |
| Dealers directory | Badge beside shop name |
| Dealer map popup / panel | Badge beside shop name |
| Listing cards + bike detail | Verified dealers show **Verified dealer**; unverified dealers stay **Dealer**; private stays **Private** |

## i18n

Add keys (en + si), e.g. `verifiedDealer`, `verified` (badge short label), admin labels for the toggle.

## Out of scope

Document upload / KYC workflow, paid verification, “why verified” marketing page, separate logo mark variants, email notify on verify.
