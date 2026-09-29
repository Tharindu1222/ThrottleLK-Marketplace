# Shop-first showroom hero (Approach A)

Date: 2026-09-29  
Status: Approved + implemented  
Component: `apps/web/src/components/dealer-showroom-profile.tsx` (bike dealers + parts shops)

## Problem

The hero used a social-profile pattern: large overlapping **owner face** on the cover/card seam. Cover imagery is shop/product, so identity felt odd.

## Decision

**Shop-first banner**

1. Remove the large overlapping avatar from the card apex.
2. Lead with eyebrow → shop name (slightly larger) → facts → CTAs.
3. Owner appears only as a small secondary chip under facts (tiny avatar + name), when available.
4. Add a soft bottom scrim on the cover so white product shots don’t melt into the white card.

## Out of scope

Shop logo upload, cover-title overlay layout (Approach C), CTA/map changes.
