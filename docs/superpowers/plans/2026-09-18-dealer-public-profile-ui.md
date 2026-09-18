# Dealer Public Profile UI Redesign — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Redesign the public dealer profile article on `/dealers/[slug]` into Approach A (profile strip): left-aligned identity, primary Call/WhatsApp, compact details, soft map — no nested boxes.

**Architecture:** Single-file layout change in `apps/web/src/app/[locale]/dealers/[slug]/page.tsx`. Reuse `DealerMapEmbed`, existing i18n keys, and ThrottleLK tokens. Inventory section untouched.

**Tech Stack:** Next.js App Router (RSC), Tailwind, existing Leaflet embed.

## Global Constraints

- White / red / black / grey only; no new theme.
- No API/schema changes.
- No inventory redesign.
- Cover `alt=""` when decorative; accessible tel/wa links with focus-visible.

---

### Task 1: Rewrite profile article layout

**Files:** `apps/web/src/app/[locale]/dealers/[slug]/page.tsx`

- [x] Replace 3-column identity grid with left-aligned avatar + text strip
- [x] Move Call/WhatsApp under identity as primary actions
- [x] Compact detail rows (quiet icons, no Overview header, hairlines only)
- [x] Soft map band (no nested border; Open in maps link)
- [x] Preserve no-map fallback for details-only
- [x] Clamp description; decorative cover alt when image present
- [ ] Visual check at mobile + desktop widths

**Done when:** Profile matches Approach A; inventory still renders below.
