# Dealer public profile UI redesign

**Date:** 2026-09-18  
**Page:** `/[locale]/dealers/[slug]` — profile/header article only (inventory grid unchanged)  
**Approach:** A — Profile strip  
**Palette:** Existing white / red accent / black / grey (no new theme)

## Goal

Buyers should instantly see **who** the dealer is, **how to contact** them, then **where** they are — without nested boxes or competing columns.

## Layout (top → bottom)

### 1. Cover
- Full-bleed within the article shell (soft outer radius only; no inner frames).
- Height: ~200px mobile / ~280–320px desktop.
- Bottom fade into content surface (keep readable overlap for avatar).
- Cover image: decorative when avatar+name present → `alt=""`; if no cover, keep brand gradient fallback.

### 2. Identity strip (single band)
- **Left-aligned** on all breakpoints (no 3-column empty right spacer).
- Row: **avatar** (overlapping cover) + **text stack** (Dealer eyebrow → name → optional bio).
- Bio: `line-clamp-3` (or max ~120–160 chars visual); no layout blowout from junk text.
- Avatar remains circular with white ring; size ~96–112px.

### 3. Contact actions (primary)
- Directly under identity: **Call** and **WhatsApp** as the strongest controls.
- Distinct icons (phone vs WhatsApp green); show numbers; full-width stack on very small screens, inline wrap otherwise.
- Accessible names keep label + number; visible focus rings.

### 4. Details (secondary, compact)
- No “Overview” chrome header.
- Vertical list or soft two-column wrap of rows: icon (quiet, no heavy pink discs) + value.
- Drop redundant uppercase labels when the value is self-explanatory (email, website, social). Keep a short label only for location/address if needed for clarity.
- Social link text: destination-oriented (e.g. “Facebook”, “TikTok” OK if that’s the brand name of the destination; prefer opening in new tab with `rel`).
- Grouping via spacing + hairline dividers only — **no bordered cards**.

### 5. Map (tertiary support)
- Only when lat/lng present.
- Soft full-width (or max ~40% width beside details on large screens) **without** nested bordered panel.
- Minimal chrome: “Open in maps” text link; optional tiny “Location” label — not shouting “MAP LOCATION”.
- Map fills its region edge-to-edge inside the article; hairline separator from details only.

### 6. No-map fallback
- If no coordinates but details exist: details band alone (same compact rows).
- If neither: omit the band.

## Explicit non-goals
- No Call/WhatsApp duplicate CTA buttons elsewhere in this article.
- No redesign of inventory grid / pagination in this change.
- No API / schema changes.
- No purple / cream / newspaper visual directions; stay on ThrottleLK tokens.

## Accessibility
- Semantic headings: one `h1` (dealer name).
- Phone/WhatsApp: real `<a href="tel:">` / `wa.me` with accessible names.
- External links: `target="_blank"` + `rel="noreferrer"`.
- Focus-visible styles on all actions.
- Map remains optional enhancement; “Open in maps” always available when coords exist.
- Respect reduced motion (no new motion required).

## Success criteria
- First glance: name + avatar + contact path obvious.
- No nested bordered boxes inside the profile article.
- No empty third column / centered-vs-left conflict.
- Map does not visually equal contact details.
- Works on mobile and desktop without horizontal overflow.
