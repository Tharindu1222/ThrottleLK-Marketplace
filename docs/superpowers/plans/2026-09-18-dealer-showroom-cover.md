# Dealer Showroom Cover Account Tab — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Dealer-only account tab to manage the single showroom cover photo via existing owner APIs.

**Architecture:** New `/{locale}/account/showroom` page + client cover manager; sidebar item gated on `roles.includes('dealer')`. No API changes.

**Tech Stack:** Next.js App Router, existing `apiGet` / `apiUpload` / `apiSend`, i18n `t()`.

## Global Constraints

- `MAX_DEALER_IMAGES = 1`; replace = delete then upload
- Preview: fixed box, `object-contain`
- Owner endpoints only (not admin)

---

### Task 1: i18n

- Modify `apps/web/src/lib/i18n.ts` — add en+si keys for showroom nav/page/actions

### Task 2: Sidebar

- Modify `account-sidebar.tsx` — dealer-gated nav item after Account details

### Task 3: Page + manager

- Create `account/showroom/page.tsx` + `showroom-client.tsx` (or `dealer-showroom-cover-manager.tsx`)
- Load `dealers/mine`, manage cover, view showroom link
