# Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently switch marketplace + admin to a light red/white/gray/black theme.

**Architecture:** Flip CSS tokens in `globals.css`, restyle admin purple→red light skin, then replace hardcoded dark-only utilities (`border-white/*`, `ring-white/*`, `hover:bg-white/5`, etc.) with black/gray opacity equivalents. Keep `text-white` on red buttons and intentional dark hero regions.

**Tech Stack:** Next.js app (`apps/web`), Tailwind v4 CSS variables in `globals.css`

## Global Constraints

- Permanent light only (no toggle)
- Accent red `#e10600` only for actions/highlights
- Admin uses same light palette (no purple)
- Hero diagonal black/white split retained

---

### Task 1: CSS tokens (marketplace + admin)

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1:** Set marketplace `:root` to light values from spec
- [ ] **Step 2:** Restyle `.admin-app` to light red/white/gray/black; update `.admin-btn-primary:hover` and gradients
- [ ] **Step 3:** Visual check home page background is white

### Task 2: Chrome + shared components

**Files:**
- Modify: `apps/web/src/components/site-header.tsx`, `site-footer.tsx`, `browse-filters.tsx`, `listing-card.tsx`, `save-search-button.tsx`, `compare-tray.tsx`, `searchable-combobox.tsx`, `listing-actions.tsx`, `listing-image-manager.tsx`, `report-listing.tsx`, `bike-category-browse-page.tsx`, home components

- [ ] **Step 1:** Replace `border-white/*` → `border-black/*`, `ring-white/*` → `ring-black/*`, `hover:bg-white/5` → `hover:bg-black/5` where on light chrome
- [ ] **Step 2:** Fix avatar placeholders for light header (dark text on light gray chip)
- [ ] **Step 3:** Keep hero `text-white` / dark-side styling; keep accent button `text-white`

### Task 3: Marketplace pages/forms

**Files:**
- Modify: login/register/forgot/reset forms, sell/edit forms, account pages, bikes/dealers/brands/guides/compare pages, contact-panel, etc.

- [ ] **Step 1:** Same border/ring/hover replacements
- [ ] **Step 2:** Ensure form inputs readable on white (dark text, black/10 rings)

### Task 4: Admin light red skin

**Files:**
- Modify: admin components that hardcode purple or white-on-dark assumptions beyond CSS vars

- [ ] **Step 1:** Confirm admin inherits new tokens from Task 1
- [ ] **Step 2:** Fix any leftover purple hex / white-border classes in admin TSX

### Task 5: Verify

- [ ] **Step 1:** Spot-check home, bikes browse, listing detail, sell, account, admin
- [ ] **Step 2:** Commit theme changes
