# Verified Dealer Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins can toggle dealer verification independently of active status; buyers see a Verified badge on showroom, directory, map, and listings.

**Architecture:** Reuse `dealers.verified_at`. Stop auto-setting on approve/activate. Admin create/update accept `verified: boolean`. Listings expose `dealerVerified`. Shared web badge component + i18n.

**Tech Stack:** NestJS + TypeORM, Zod validation, Next.js App Router, existing admin dealers UI.

## Global Constraints

- Verified = `verifiedAt != null`; public badge only if dealer is active and verified.
- Approve/activate must not auto-verify.
- Leaving `active` clears `verifiedAt`.
- Migration nulls existing `verified_at`.
- No KYC, paid verification, or notify-on-verify.

---

### Task 1: Validation + API stop auto-verify + admin `verified`

**Files:**
- Modify: `packages/validation/src/index.ts` — add `verified` to admin create/update schemas
- Modify: `apps/api/src/dealers/dealers.service.ts` — applyVerified rules; remove auto-set in `adminCreate`, `adminUpdate`, `approve`; clear on non-active
- Modify: `apps/api/src/dealers/dealers.service.spec.ts` — assert approve does not set `verifiedAt`
- Create: `apps/api/src/migrations/1726700000000-ClearDealerVerifiedAt.ts`

**Interfaces:**
- Produces: `AdminCreateDealerInput.verified?: boolean`, `AdminUpdateDealerInput.verified?: boolean`
- Produces: `applyVerified(dealer, verified: boolean | undefined, status: string)` behavior

- [ ] **Step 1:** Add `verified: z.boolean().optional()` to `adminCreateDealerSchema` and `adminUpdateDealerSchema`
- [ ] **Step 2:** Update `adminCreate` / `adminUpdate` / `approve` / `reject` per design (no auto-verify; clear when not active; honor `input.verified` when active)
- [ ] **Step 3:** Extend approve tests: `expect(approved.verifiedAt).toBeNull()` (or undefined/null)
- [ ] **Step 4:** Add migration `UPDATE dealers SET verified_at = NULL`
- [ ] **Step 5:** Run `npx jest dealers.service.spec.ts` from `apps/api` — expect PASS
- [ ] **Step 6:** Commit API verification logic

### Task 2: Listing `dealerVerified`

**Files:**
- Modify: `apps/api/src/dealers/dealers.service.ts` — `findActiveById` already returns dealer; add `activeVerifiedIds(ids: string[]): Promise<Set<string>>`
- Modify: `apps/api/src/listings/listings.service.ts` — detail + browse cards include `dealerVerified`
- Modify: `apps/api/src/listings/listings.service.spec.ts` if applicable

- [ ] **Step 1:** Implement batch `activeVerifiedIds`
- [ ] **Step 2:** `getPublic` / detail path: `dealerVerified: Boolean(shop?.verifiedAt)`
- [ ] **Step 3:** Browse list paths: batch-resolve dealer IDs → `dealerVerified` on each card
- [ ] **Step 4:** Run listings + dealers specs — PASS
- [ ] **Step 5:** Commit

### Task 3: Admin UI toggle

**Files:**
- Modify: `apps/web/src/components/admin/admin-dealers.tsx`

- [ ] **Step 1:** Add `verified: boolean` to form state; derive from `verifiedAt`
- [ ] **Step 2:** Checkbox in editor (disabled unless status is `active`)
- [ ] **Step 3:** Table shows verified indicator beside shop name
- [ ] **Step 4:** Create/update payloads send `verified`
- [ ] **Step 5:** Commit

### Task 4: Public badge + i18n

**Files:**
- Create: `apps/web/src/components/verified-dealer-badge.tsx`
- Modify: `apps/web/src/lib/i18n.ts` — `verified`, `verifiedDealer`, admin labels if needed
- Modify: showroom `dealers/[slug]/page.tsx`, dealers `page.tsx`, map multi component, `listing-card.tsx`, bikes `[slug]/page.tsx`

- [ ] **Step 1:** Add i18n keys en + si
- [ ] **Step 2:** Shared badge component
- [ ] **Step 3:** Wire all four surfaces; listings use `dealerVerified` → `verifiedDealer` label
- [ ] **Step 4:** Smoke-check pages / typecheck
- [ ] **Step 5:** Commit
