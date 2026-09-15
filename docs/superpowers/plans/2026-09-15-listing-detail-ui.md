# Listing Detail UI Implementation Plan

> **For agentic workers:** Implement Approach A from `docs/superpowers/specs/2026-09-15-listing-detail-ui-design.md`. UI-only; no API changes.

**Goal:** Marketplace-style listing detail with gallery, spec cards, sticky contact, pill actions.

**Files:**
- Create `apps/web/src/components/listing-gallery.tsx` (client cover + thumbs)
- Modify `apps/web/src/app/[locale]/bikes/[slug]/page.tsx`
- Modify `apps/web/src/app/[locale]/bikes/[slug]/contact-panel.tsx`
- Modify `apps/web/src/components/listing-actions.tsx`
- Modify `apps/web/src/lib/i18n.ts` — add `colour` key if missing

## Task 1: Gallery component
Client component: images array, initial cover, empty state with brand logo.

## Task 2: Page layout
Header, meta line, gallery, actions, specs grid, description, report; sticky aside wrapper.

## Task 3: Contact panel + actions restyle
Card chrome, avatar, CTA buttons; pill favourite/compare buttons.

## Task 4: Verify
Typecheck / lint touched files; manual visual check on `/en/bikes/[slug]`.
