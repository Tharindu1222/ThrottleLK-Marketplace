# Listing gallery arrows + lightbox

**Date:** 2026-09-18  
**Status:** Approved (Approach A)  
**Scope:** Listing detail gallery only (`ListingGallery` on bike detail page)

## Goal

Let buyers step through listing photos with on-image arrows and open a simple lightbox for a larger view.

## Non-goals

- New npm lightbox library
- Shared reusable lightbox used outside listing detail
- Pinch-zoom / swipe gestures (nice-to-have later)
- API or image URL changes

## Approach

**A — Extend `listing-gallery.tsx`:** cover overlay controls + in-component lightbox dialog. No new dependencies.

## Behaviour

### Cover

- Left / right circular controls over the main image when `images.length > 1`
- Wrap around (last → first, first → last)
- Top-right expand control opens lightbox
- Clicking the main image also opens lightbox
- Keyboard ← / → when the gallery region is focused (optional enhancement if easy)
- Single image: hide arrows; expand still available

### Lightbox

- Dark overlay (`bg-black/90`), centered image with `object-contain`
- Same prev / next arrows when multiple images; close (X) top-right
- Esc closes; ← / → navigate; lock body scroll while open
- Counter text: `{current} / {total}`
- `role="dialog"`, `aria-modal="true"`, labelled close / nav buttons
- Sync active index with thumbnails when lightbox closes

### Thumbnails

- Unchanged row under cover; selecting a thumb updates cover and lightbox index

## Visual

- Controls: semi-transparent dark circles, white icons, hover brighten; match existing accent only on active thumbnail ring
- Inline SVGs (same pattern as other web components)
- Mobile: controls always visible enough to tap (min ~40px hit target)

## i18n

New keys (en + si): previous photo, next photo, view fullscreen / expand, close, photo counter if needed.

## Files

- `apps/web/src/components/listing-gallery.tsx` — primary change
- `apps/web/src/lib/i18n.ts` — strings

## Out of scope follow-ups

- Touch swipe in lightbox
- Dealer profile galleries
