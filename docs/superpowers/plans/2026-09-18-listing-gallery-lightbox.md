# Listing Gallery Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add prev/next arrows on the listing cover image and a simple lightbox for fullscreen viewing.

**Architecture:** Keep everything in `ListingGallery`. Track active index (not just URL). Overlay controls on the cover; portal a lightbox dialog with the same navigation, Esc/arrow keys, and body scroll lock (same pattern as `listing-message-popup.tsx`).

**Tech Stack:** Next.js client component, React `createPortal`, existing `t()` i18n, inline SVGs.

## Global Constraints

- No new npm dependencies
- Listing detail gallery only (`apps/web/src/components/listing-gallery.tsx`)
- Match ThrottleLK light theme controls (dark translucent circles, white icons)
- en + si strings required

---

### Task 1: i18n strings

**Files:**
- Modify: `apps/web/src/lib/i18n.ts`

**Produces:** keys `galleryPrev`, `galleryNext`, `galleryExpand`, `galleryClose`, `galleryCounter`

- [ ] **Step 1: Add English keys** near `photoComingSoon`:

```ts
galleryPrev: 'Previous photo',
galleryNext: 'Next photo',
galleryExpand: 'View fullscreen',
galleryClose: 'Close',
galleryCounter: '{current} / {total}',
```

- [ ] **Step 2: Add Sinhala keys** near `photoComingSoon` in `si`:

```ts
galleryPrev: 'පෙර ඡායාරූපය',
galleryNext: 'ඊළඟ ඡායාරූපය',
galleryExpand: 'පූර්ණ තිරයෙන් බලන්න',
galleryClose: 'වසන්න',
galleryCounter: '{current} / {total}',
```

- [ ] **Step 3: Typecheck** — `keyof typeof en` must include both locales with same keys (Dict already enforces via usage).

---

### Task 2: Gallery navigation + lightbox UI

**Files:**
- Modify: `apps/web/src/components/listing-gallery.tsx`

**Consumes:** i18n keys from Task 1  
**Produces:** Working arrows + lightbox on listing detail

- [ ] **Step 1: Refactor state to active index**

Derive `urls` from ordered images (or `[fallback]`). Use `activeIndex` + `lightboxOpen`.

- [ ] **Step 2: Cover overlays**

Relative wrapper; left/right buttons when `urls.length > 1`; expand button top-right; click main image opens lightbox; `stopPropagation` on controls.

- [ ] **Step 3: Lightbox via `createPortal`**

When open: portal to `document.body`, `role="dialog"` `aria-modal`, dark overlay, contain image, arrows, close, counter, Esc/←/→, restore body overflow and focus on close.

- [ ] **Step 4: Manual verify** on a listing with 2+ photos and a single-photo listing.

---

### Task 3: Spec coverage check

- Cover arrows + wrap ✓
- Expand + click-to-open lightbox ✓
- Esc / arrows / scroll lock / counter ✓
- Single image hides arrows ✓
- Thumbnails sync ✓
