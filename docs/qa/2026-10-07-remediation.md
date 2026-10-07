# ThrottleLK QA remediation and verification

Date: 7 October 2026

All 21 findings from the [senior QA review](2026-10-07-senior-qa-review.md) have been addressed in the working tree. Existing uncommitted work was preserved. No production deployment or production database changes were made.

## Fixes

| Finding | Implemented change | Verification |
|---|---|---|
| QA-01 | Capture narrowed access tokens in admin callbacks and guard category uploads. | Web TypeScript check and production build. |
| QA-02 | Add API ESLint flat configuration and explicit ESLint/TypeScript plugin dependencies; repair lint failures. | Root lint exits successfully. Existing web warnings remain. |
| QA-03 | Add a frozen baseline for the 21 core tables that predate incremental migrations. Adopt complete existing schemas without rewriting their data. | Real PostgreSQL empty-schema migration, rerun, and existing-schema adoption tests. |
| QA-04 | Apply review transitions to material edits on active, paused, and expired bike/part listings. No-op and permitted price-only edits retain their state. | Unit and database tests reject resume/renew after material edits. |
| QA-05 | Owner uploads/deletions send active, paused, and expired galleries back to review. Admin gallery edits preserve status. | PostgreSQL image tests using valid PNG input and mocked object storage. |
| QA-06 | Settle payment status and listing credits in one transaction with an order row lock. | Injected quota failure rolls back payment; retry credits successfully. |
| QA-07 | Increment/debit credits atomically with an upsert; quota usage updates cannot overwrite purchased credits. Duplicate chargebacks debit once. | Concurrent distinct and duplicate callbacks plus concurrent chargebacks. |
| QA-08 | Validate promotion payment against its stored checkout price and currency. Snapshot duration, tier, surfaces, priority, and name; activation and live status use that snapshot. | Change package price/duration/tier after checkout; payment and original benefits remain correct. |
| QA-09 | Give replacement checkouts separate immutable request/order records, retain previous orders, remove request-ID callback fallback, and serialize callbacks/replacements. | Delayed old-order payment affects its own record and leaves replacement unpaid. Late success cannot revive a chargeback. |
| QA-10 | Allow refresh-cookie account navigation; deduplicate refreshes, serialize them across tabs using Web Locks, and retry the original protected API call. Header uses the shared flow. | Unit tests for concurrent requests, action/body preservation and failed refresh; Chromium test with two tabs and HttpOnly cookies. |
| QA-11 | Reject owner gallery changes on sold bikes; admin gallery edits preserve sale state. | Sold upload rejected and stored sale state retained. |
| QA-12 | Apply expiry-aware visibility to part detail, images, inquiries, favourites, engagement, and conversation creation. | Expired direct detail/contact/images rejected. |
| QA-13 | Centralize active seller/shop predicates across public detail, browse, promoted cards, SEO, favourites, images and messaging. Filter shop directories/maps by active owner and invalidate public caches on visibility changes. | Suspended seller/shop reads and cards excluded; public payload privacy and cache invalidation checks. |
| QA-14 | Cast UUID report IDs to text before search expressions. | Actual PostgreSQL searches for bike and part UUIDs. |
| QA-15 | Parenthesize the participant OR before applying inbox filters. | Actual buyer listing filter and unread filter return only matching conversations. |
| QA-16 | Propagate listing cost/date edits and clearing into inventory; inventory edits synchronize linked listing fields in one transaction. | Updates in both directions, clearing and linked inventory values. |
| QA-17 | Preserve mileage zero; submit null for optional field clearing and accept those values in the PATCH schema. | Validation and actual database persistence tests. |
| QA-18 | Allow the exact GA4 and Clarity script origins in CSP. | Chromium loads both provider scripts under the production policy; provider responses are mocked. |
| QA-19 | Reject ancestor cycles and serialize parent graph updates in a transaction using the same connection. | Direct cycle and concurrent opposite-parent updates. |
| QA-20 | Run expiry work on one transaction-bound manager using transaction-scoped advisory locks. | Concurrent jobs expire each row once and release locks at transaction completion. |
| QA-21 | Extend SEO pagination beyond the browse limit, verify pagination progress, deduplicate URLs, and emit a sitemap index with files of at most 45,000 URLs. | Page 201 advances correctly; 105,001 URLs split without omissions or duplicates. |

Web tests now discover every spec automatically. Specs that depended on undeclared Jest globals use Node's test runner. CI runs web tests and the PostgreSQL regression script alongside the existing checks. Stale API fixtures were repaired, and meaningful regression cases were added.

## Validation

| Check | Final result |
|---|---|
| API unit tests | 47 suites, **244 tests passed**. |
| Web unit tests | **63 tests passed**, including all discovered specs. |
| Shared validation | **14 tests passed**. |
| PostgreSQL 16 regression groups | **10 passed**, using isolated disposable schemas. |
| Playwright Chromium | **7 passed**, including production CSP and two-tab refresh. |
| Production builds | Shared packages, API and web passed. |
| Web TypeScript check | Passed. |
| Root lint | Passed with existing nonblocking web warnings. |
| Git whitespace check | Passed. |

Total: **338 passing tests/regression groups**. Test groups contain multiple scenarios; this count is not a count of individual assertions.

The database regressions execute freshly compiled services against real PostgreSQL with synchronization disabled. They run the entire migration chain, inject a database failure for payment rollback, exercise concurrency, and use actual TypeORM SQL. Object storage, notifications, and PayHere verification are mocked boundaries. The browser session test uses actual browser cookies and Web Locks with mocked API responses. This does not verify a real PayHere transaction, production R2/SMTP integration, or every marketplace journey.

## Migration and operational guidance

Two migrations were added:

- `1726500000000-InitialMarketplace.ts`: creates the missing core baseline on a fresh database; returns without DDL when every core table already exists. An incomplete core schema fails with an explicit diagnostic. Reverting the baseline is intentionally refused; restore a backup instead.
- `1728700000000-AddPromoPackageSnapshot.ts`: adds and backfills immutable promotion benefit snapshots and a unique PayHere order index.

Apply these through the normal migration workflow. The API already calls `runMigrations()` during startup. The existing-schema adoption path was tested without deleting or changing user rows. Snapshot backfill uses current package benefits for legacy rows because their original benefits were never stored.

Previously paid listing orders that lost credits need financial reconciliation against provider receipts and account history. The old schema does not record per-order credit delivery, so automatically adding all historical paid orders could double-credit sellers. New payments commit atomically.

If an old promotion checkout receives payment after replacement, its own rejected request records that payment and remains available for reconciliation; it does not settle or activate the replacement. No automated refunds are issued by this change.

## Re-running database regressions

Build the API first, then point `TEST_DATABASE_URL` at a disposable local database named `throttlelk_qa*`:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres:qa_local_only@127.0.0.1:55432/throttlelk_qa'
npm run build -w @throttlelk/api
npm run test:integration -w @throttlelk/api
```

The script refuses non-local databases or other database names. Each run creates a uniquely named schema and removes only that schema during cleanup. CI provisions its own PostgreSQL service and runs this script automatically.
