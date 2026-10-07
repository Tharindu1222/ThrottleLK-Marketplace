# ThrottleLK senior QA review

Date: 7 October 2026

**Remediation update:** All 21 findings below have been implemented and regression tested. See [the remediation and verification record](2026-10-07-remediation.md). The assessment and source line locations below describe the original pre-fix audit.

**Release assessment: hold release until the build, CI, moderation, and payment findings are resolved.** This review identified **21 actionable findings: 11 High and 10 Medium**. Severity describes user/business impact; evidence labels distinguish executed reproductions from source analysis.

## Scope and evidence

Reviewed the current working tree, including its existing uncommitted changes: Next.js frontend, NestJS API, shared validation/types, listing lifecycle, images, dealer shops/inventory, conversations, reports, saved searches, promotions/listing packages, migrations, caching, deployment, and test configuration. Application source was not edited.

Validation performed:

| Check | Result |
|---|---|
| API unit tests | 47 suites; 46 passed, 1 failed. 238 tests passed, 2 failed. |
| Shared validation tests | 13 passed. |
| Declared web unit tests | 38 passed. |
| All discovered web specs, from `apps/web` | 46 passed; 3 files failed because they use undeclared Jest globals under the Node test runner. |
| Shared types, validation, API builds | Passed. |
| Web TypeScript check | Failed with 9 nullable-token errors. |
| Web production build | Failed at `admin-moderation.tsx:491`. |
| Root lint | Failed because API ESLint configuration is missing. Web lint emitted warnings. |
| Focused service probes | 13 scenarios reproduced using freshly compiled application services and mocked repositories/storage/payment verification. |
| Web probes | Reproduced refresh-only middleware redirect and API unauthorized redirect; headless Chromium reproduced two analytics CSP blocks. |
| SQL inspection | Generated actual TypeORM SQL without a database connection for inbox filtering and report search. |

No API, web, PostgreSQL, or Redis listener was available on the standard local ports when checked. Full application E2E, live PostgreSQL execution, actual PayHere payments, actual R2 uploads, mobile layout, accessibility, and load testing were not performed. Mocked service probes establish the application control flow; they do not establish production occurrence rates or third-party behavior. PostgreSQL findings below are identified from schema/query semantics unless explicitly stated otherwise.

## Findings

### QA-01 — High — Web production build fails

**Evidence:** Reproduced by `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json` and `npm run build -w @throttlelk/web`.

**Location:** `apps/web/src/components/admin/admin-moderation.tsx:491` and `apps/web/src/components/admin/category-cover-manager.tsx:51`.

**Reproduce:** Build the current web workspace. `token` is typed `string | null` but is passed into functions/props requiring `string` or `string | undefined`. The standalone check reports seven errors in admin moderation and two in category cover management. Next stops at the first error.

**Expected / actual:** A deployable production bundle / build exits with code 1, preventing the web release.

**Fix:** Narrow/capture the token in each action handler and normalize nullable optional prop values. Re-run the web type check and production build.

### QA-02 — High — API lint always fails and blocks CI deployment

**Evidence:** Reproduced by `npm run lint`.

**Location:** `apps/api/package.json:14`; `.github/workflows/ci.yml:20`.

**Reproduce:** Run the root lint script. The API invokes ESLint 9, which cannot find `eslint.config.js`, `.mjs`, or `.cjs` for that workspace. The only ESLint configuration belongs to the web workspace.

**Expected / actual:** API lint analyzes files successfully / exits with code 2 before linting. Deployment depends on the CI lint job, so this blocks the configured pipeline.

**Fix:** Add a compatible API ESLint configuration and its explicit dependencies; verify lint from a clean `npm ci` installation.

### QA-03 — High — A fresh database cannot be initialized by the migration chain

**Evidence:** Source verified; fresh PostgreSQL startup was not executed.

**Location:** `apps/api/src/migrations/1726580000000-AddPerformanceIndexes.ts:11`; `apps/api/src/app.module.ts:71`; `apps/api/src/main.ts:14`.

**Reproduce:** Point the API or migration CLI at an empty PostgreSQL database and run migrations/start the API. The earliest migration creates indexes on `listings` and other core tables, but there is no preceding migration creating those tables. Both runtime and CLI disable schema synchronization.

**Expected / actual:** An empty database becomes a usable marketplace schema / the first index statement targets a nonexistent table. The bike catalog seed only synchronizes three taxonomy entities and does not supply the missing core schema.

**Fix:** Provide a complete baseline migration before the incremental migrations, with an explicit adoption procedure for existing databases. Validate both empty-database initialization and upgrades from an existing schema.

### QA-04 — High — Paused/expired listings can publish edited content without moderation

**Evidence:** Reproduced for both bike and part services, through both paused/resume and expired/renew paths.

**Location:** `apps/api/src/listings/listings.service.ts:134`, `:233`, `:1328`; `apps/api/src/part-listings/part-listings.service.ts:137`, `:232`, `:253`.

**Reproduce:** Start with an approved listing; pause it or let it expire; PATCH its title/description/category; resume or renew it.

**Expected / actual:** Material changes require another review / the edited listing goes directly to `active`. Updating an active listing triggers review, while editing the same content after pausing avoids that rule.

**Fix:** Persist whether public content changed after approval. Resume/renew must route changed content through review, or edits should immediately change the status to `pending_review`.

### QA-05 — High — Parts photos can change on a live listing without review

**Evidence:** Reproduced by uploading a valid PNG through the compiled part image service with mocked storage.

**Location:** `apps/api/src/part-listings/part-listing-images.service.ts:65`, `:105`.

**Reproduce:** Approve a part listing, then upload another photo through `/part-listings/:id/images` while it is active.

**Expected / actual:** New public photo content is reviewed, consistent with bike photo uploads / the photo is saved and the listing stays `active`. Deleting/replacing photos can also change the public gallery without a review transition.

**Fix:** Apply the same moderation policy to part image changes as to bike content, including paused/expired cases. Keep admin actions explicit.

### QA-06 — High — A paid listing package can permanently receive zero credits

**Evidence:** Reproduced by injecting a repository failure after the order status update, then retrying the verified callback.

**Location:** `apps/api/src/listing-packages/listing-packages.service.ts:336`, `:348`, `:361`.

**Reproduce:** Process a successful payment notification. Allow the order UPDATE to commit `paid`, then fail quota creation/update. Retry the notification.

**Expected / actual:** Payment and quota credits commit together, or a retry completes the missing credit / retry sees `paid` and returns immediately. The seller has paid but received no credits, with no automatic recovery path.

**Fix:** Commit payment status and quota increment in one database transaction. Make idempotency depend on the completed credit operation, not only the payment flag. Apply the same principle to chargeback debits.

### QA-07 — High — Concurrent package purchases lose listing credits

**Evidence:** Reproduced: two simultaneous additions of 15 credits left 15 credits instead of 30.

**Location:** `apps/api/src/listing-packages/listing-packages.service.ts:496`.

**Reproduce:** Deliver successful callbacks for two distinct orders belonging to the same seller at the same time. `addPurchased()` loads the same quota, computes the next balance in JavaScript, and saves it.

**Expected / actual:** Both purchases contribute to the balance / the last save overwrites the other increment. Concurrent chargebacks also lack protected balance/status transitions.

**Fix:** Use an atomic database increment/upsert, or lock the quota row within the payment transaction. Test concurrent distinct orders and repeated chargebacks.

### QA-08 — High — Editing a promotion package price rejects an in-flight payment

**Evidence:** Reproduced with a checkout amount of Rs. 1,000 and a subsequently changed package price of Rs. 2,000.

**Location:** `apps/api/src/promotions/promotions.service.ts:552`.

**Reproduce:** Create a promotion checkout; change that package's price in admin; receive the valid successful callback for the original checkout amount.

**Expected / actual:** Validate against the checkout's stored `chargedPriceLkr` / validation uses the current package price and marks the paid request `failed`.

**Fix:** Validate amount/currency against an immutable order snapshot. Snapshot the purchased duration/tier/surfaces too, because activation currently reads the mutable package.

### QA-09 — High — Old promotion callbacks can pay a replacement checkout

**Evidence:** Reproduced with a callback for `old-order` and a request whose stored order was `new-order`. Payment verification was mocked as successful; no forged signature was assumed.

**Location:** `apps/api/src/promotions/promotions.service.ts:279`, `:513`, `:522`.

**Reproduce:** Open one checkout, then reclaim its unpaid pending request into a second checkout. Deliver the first checkout's delayed callback with its original `custom_1` request ID and the same amount.

**Expected / actual:** The callback settles only its original order / lookup fails on old order ID, falls back to request ID, and marks the replacement request paid. A delayed failure or chargeback can similarly affect the wrong checkout.

**Fix:** Give every payment attempt an immutable record. Require callback order ID to equal that record's stored order ID, and do not authorize payment state changes through the request-ID fallback.

### QA-10 — High — Sessions redirect users to login after access-token expiry despite a valid refresh cookie

**Evidence:** Reproduced middleware and client API control flow. Middleware returned 307 to login for an account URL carrying only the refresh cookie; the API helper redirected on 401 without attempting refresh.

**Location:** `apps/web/src/middleware.ts:15`, `:54`; `apps/web/src/lib/api.ts:27`; `apps/web/src/components/site-header.tsx:81`; `apps/api/src/auth/auth.controller.ts:184`.

**Reproduce:** Log in, remain on a page for more than 15 minutes, then perform a protected action or navigate to an account page. The seven-day refresh cookie is still valid.

**Expected / actual:** Refresh access transparently and retry the action / middleware requires the expired access cookie and the API helper redirects immediately. Header refresh runs on mount only, so it does not reliably recover an already-open page or its pending action. This can interrupt a listing form or conversation.

**Fix:** Implement one shared, deduplicated refresh-and-retry path; coordinate middleware/account navigation with refresh availability. Ensure multiple tabs cannot race refresh rotation.

### QA-11 — Medium — Uploading a photo to a sold bike can reopen it for sale

**Evidence:** Reproduced the sequence `sold -> upload -> pending_review -> approve -> active`; the old sold price remained on the record.

**Location:** `apps/api/src/listings/listing-images.service.ts:103`; `apps/api/src/listings/listings.service.ts:1308`.

**Reproduce:** Mark a bike sold while it has fewer than five photos; upload a photo using the owner image endpoint; approve the resulting review item.

**Expected / actual:** A sold listing preserves its completed-sale state / upload replaces `sold` with `pending_review`, and approval activates it again with stale sale fields.

**Fix:** Reject owner photo changes on sold listings or track sale state independently of review state. Approval must preserve the prior sale outcome.

### QA-12 — Medium — Expired parts remain accessible and contactable by direct URL

**Evidence:** Reproduced public detail access to an `active` part with `expiresAt` in the past.

**Location:** `apps/api/src/part-listings/part-listings.service.ts:473`, `:508`, `:561`; `apps/api/src/part-listings/part-listing-images.service.ts:173`.

**Reproduce:** Access a part after its timestamp expires but before the hourly job changes its status to `expired`.

**Expected / actual:** Public detail/contact enforce the same expiry rule as browse / browse excludes it, while detail and contact inspect status alone; image access passes `null` as the expiry. The gap can last until the next successful job.

**Fix:** Use the shared expiry-aware visibility predicate consistently in part detail, images, contact, favourites, and conversation start.

### QA-13 — High — Suspending a seller or shop does not hide its active advertisements

**Evidence:** Source verified across public listing queries; a service probe also returned a public part belonging to a suspended shop.

**Location:** `apps/api/src/users/users.service.ts:476`; `apps/api/src/listings/listings.service.ts:423`, `:605`; `apps/api/src/part-listings/part-listings.service.ts:473`, `:1199`; `apps/api/src/dealers/dealers.service.ts:481`; `apps/api/src/parts-dealers/parts-dealers.service.ts:463`.

**Reproduce:** Suspend a user with active ads, or set a dealer/parts shop to `suspended`; then browse or open the ad as an anonymous buyer.

**Expected / actual:** Marketplace suspension prevents the suspended seller/shop from continuing to advertise and receive buyer contacts / login or shop-directory access is disabled, but the listing queries check listing status and expiry without requiring an active seller/shop. Existing ads remain public with contact details.

**Fix:** Define and enforce suspension visibility centrally across browse, detail, promotions, contact, and messaging. Account/shop suspension should invalidate the corresponding public caches.

### QA-14 — Medium — Searching the admin reports queue generates invalid PostgreSQL expressions

**Evidence:** Actual TypeORM SQL generated and column metadata inspected; database execution was not performed.

**Location:** `apps/api/src/reports/reports.service.ts:93`; `apps/api/src/reports/report.entity.ts:28`.

**Reproduce:** Supply any nonempty `q` to the admin open-reports endpoint. The search includes `LOWER(COALESCE(r.listingId, ''))` and the equivalent part ID expression.

**Expected / actual:** Search returns matching reports / both fields are UUIDs. PostgreSQL attempts to coerce the empty string to UUID, and `LOWER` also requires text. This query cannot perform the intended search and should surface as a server error.

**Fix:** Cast IDs to text before `COALESCE`/`LOWER`, or search UUID IDs through separate validated exact-match conditions. Add a real PostgreSQL integration test for bike and part reports.

### QA-15 — Medium — Inbox filters do not apply to conversations where the user is the buyer

**Evidence:** Actual generated SQL confirmed the ungrouped OR expression.

**Location:** `apps/api/src/conversations/conversations.service.ts:196`.

**Reproduce:** Have buyer conversations for listings A and B, including a read conversation; request `listingId=A` or `unread=1`.

**Expected / actual:** Apply the filter to all conversations belonging to the user / SQL becomes `buyer_user_id = $1 OR seller_user_id = $1 AND listing_id = $2`, so buyer-owned rows bypass the added filter. The unread view can contain read buyer conversations and its count/pagination is incorrect. This finding does not establish access to another user's conversations.

**Fix:** Group the participant OR using TypeORM `Brackets` before adding filters.

### QA-16 — Medium — Editing listing cost/purchase date leaves dealer inventory and margins stale

**Evidence:** Reproduced: updated listing cost Rs. 2,000 remained Rs. 1,000 in linked inventory; the old purchase date remained too.

**Location:** `apps/api/src/dealers/inventory.service.ts:329`, `:335`; `apps/api/src/listings/listings.service.ts:130`, `:967`.

**Reproduce:** Create a dealer listing with cost and purchase date; edit those values through the listing form; inspect its linked inventory and margin/day calculations.

**Expected / actual:** Linked inventory reflects the saved changes / `applyListing()` copies cost/date only when the inventory value is initially absent. It also cannot propagate clearing either field.

**Fix:** Decide which record owns these fields and synchronize edits in both directions through one service/transaction, or make one side read-only. Test updates and clearing, not only initial backfill.

### QA-17 — Medium — Bike edit cannot set mileage to zero or clear several optional fields

**Evidence:** Source verified from form serialization and PATCH schema behavior.

**Location:** `apps/web/src/app/[locale]/account/listings/[id]/edit/edit-listing-form.tsx:324`, `:329`; `packages/validation/src/index.ts:65`, `:84`.

**Reproduce:** Edit a bike with nonzero mileage and save mileage `0`. Or empty an existing WhatsApp, colour, registration year, or engine capacity field and save.

**Expected / actual:** Persist zero/clear the field / `Number(...) || undefined` drops zero and empty optional strings become `undefined`. JSON serialization omits these keys, preserving the old values while the form reports success.

**Fix:** Preserve valid zero explicitly. Add supported nullable clearing values to the PATCH schema and submit those values instead of omitting the fields.

### QA-18 — Medium — CSP blocks GA4 and Microsoft Clarity

**Evidence:** Reproduced in headless Chromium using the production CSP from `next.config.ts`: inline fixture loaded; both external analytics scripts were blocked before any request.

**Location:** `apps/web/next.config.ts:121`; `apps/web/src/components/analytics-tags.tsx:16`, `:33`.

**Reproduce:** Configure either analytics ID and load a production page. GA4 uses `www.googletagmanager.com`; Clarity loads from `www.clarity.ms`.

**Expected / actual:** Configured analytics initializes / `script-src` permits self and Cloudflare Turnstile only. Both analytics providers violate the policy, so metrics/session recordings are absent.

**Fix:** Add the exact necessary provider origins to the script policy and verify any additional provider resources under an integration test.

### QA-19 — Medium — Part category updates allow cyclic parent relationships

**Evidence:** Reproduced `A -> B -> A` through the compiled category service.

**Location:** `apps/api/src/part-listings/part-categories.service.ts:77`.

**Reproduce:** Create B as a child of A; update A's parent to B. Longer ancestor cycles are accepted too.

**Expected / actual:** Categories form an acyclic tree / validation rejects direct self-parenting only. Both categories become parent nodes and disappear from the public leaf-category list, making them unusable for listing selection.

**Fix:** Reject assigning a descendant as parent; validate the complete ancestor chain and existing-listing implications before saving.

### QA-20 — Medium — Expiry jobs use session advisory locks across unpinned pool connections

**Evidence:** Source verified; multi-connection PostgreSQL execution was not performed.

**Location:** `apps/api/src/listings/expire-stale.ts:34`, `:79`; `apps/api/src/listings/listings.service.ts:1348`; `apps/api/src/part-listings/part-listings.service.ts:1105`.

**Reproduce:** Run expiry while other requests occupy connections in a pool of at least two connections. The service acquires `pg_try_advisory_lock`, issues updates, and unlocks through separate repository `.query()` calls, each permitted to borrow a different connection.

**Expected / actual:** Acquire, work, and release on the same database session / the unlock can run on a different session and fail to release the original lock. The return value is ignored. Reused owner sessions can acquire the session lock reentrantly; other instances can skip expiry indefinitely until connection/session teardown. PostgreSQL documents the session lifetime and repeated-acquisition behavior in its [advisory lock documentation](https://www.postgresql.org/docs/16/explicit-locking.html#ADVISORY-LOCKS); TypeORM's installed `DataSource.query()` creates/releases a runner per call when none is supplied.

**Fix:** Pin one QueryRunner connection for the complete job, or use a transaction-scoped advisory lock and execute all work within that transaction. Verify connection contention and multiple application instances.

### QA-21 — Medium — Sitemap pagination repeats page 200 for large inventories

**Evidence:** Source verified.

**Location:** `apps/web/src/app/sitemap.ts:25`; `apps/api/src/common/pagination.ts:18`.

**Reproduce:** Have more than 20,000 records on an SEO-slugs endpoint (100 records/page). Sitemap generation requests page 201 onward; the API silently clamps every request to page 200 and returns metadata for page 200 with `hasNextPage=true`.

**Expected / actual:** Enumerate every unique URL once / page 200 is repeatedly appended until the sitemap's page-500 safety break. Later records are omitted and duplicate URLs inflate the sitemap. Emitting both locales can additionally exceed one sitemap's URL capacity.

**Fix:** Use cursor pagination or reject unsupported pages explicitly; make the sitemap loop verify returned page/cursor progress. Split large sitemaps into an index and bounded chunks.

## Test-suite issues and release coverage

The two API failures should not be mistaken for two proven runtime bugs:

- `apps/api/src/listings/listings.service.spec.ts:109` updates a title to its existing value but expects re-review notification. Current `changedKeys()` deliberately treats this as no change; update the fixture to change content and retain a separate no-op test.
- `apps/api/src/listings/listings.service.spec.ts:205` supplies a query-builder mock without `leftJoin`, although the implementation now calls it. Update the mock and verify the actual query through integration tests.

Web `package.json` enumerates only 10 of 14 discovered spec files. The broader run found that `owned-dealer.spec.ts`, `search-index.spec.ts`, and `visible-pages.spec.ts` use Jest globals without a configured Jest runner/imports. The CI build-test job also omits web unit tests entirely. Convert those specs to the supported runner, discover specs automatically, and add web tests to CI.

The five Playwright smoke tests cover legal pages, labels, locale, compare empty state, and a 404. They do not exercise registration/verification, listing creation, approval, pause/edit/resume, inventory synchronization, payment callbacks, session expiry, or messaging. The current web build failure prevented using a fresh production bundle for those smoke tests.

## Fix and regression order

1. Restore build/lint checks and fresh-database bootstrap: QA-01, QA-02, QA-03; repair stale test fixtures and configure all web specs.
2. Close public-content/suspension bypasses: QA-04, QA-05, QA-11, QA-12, QA-13.
3. Make order settlement and credit balances transactional/idempotent: QA-06 through QA-09. Test duplicate, concurrent, late, failed, and chargeback callbacks.
4. Restore continuous sessions: QA-10, including long forms and multiple tabs.
5. Fix SQL, inventory/edit behavior, and production analytics: QA-14 through QA-18.
6. Validate taxonomy, expiry-job concurrency, and sitemap growth: QA-19 through QA-21.

After fixes, run the checks above and add integrated journeys against a disposable database and mocked third-party boundaries. This review is an evidence-based release assessment, not an exhaustive claim that no other defects exist.
