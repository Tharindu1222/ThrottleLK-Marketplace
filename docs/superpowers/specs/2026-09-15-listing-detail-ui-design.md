# Listing detail page UI redesign

**Date:** 2026-09-15  
**Status:** Approved direction (Approach A)  
**Scope:** `/[locale]/bikes/[slug]` listing detail page only (visual/UX redesign; no API changes)

## Goal

Turn the flat white listing detail into a clear marketplace detail page: strong hierarchy, readable specs, usable gallery, and a sticky contact card that drives Call / WhatsApp / Message — aligned with ThrottleLK light theme (white / surface / `#e10600` / black).

## Non-goals

- Hero-style dark diagonal stage or speed bars on this page
- New backend fields or contact logic
- Rework of browse listing cards, sell flow, or account pages
- Full image lightbox / carousel library (keep simple cover + thumbnails)

## Layout

- Page: `max-w-7xl`, horizontal padding consistent with site chrome
- Desktop (`lg+`): two columns — main (~1.5fr) + sticky contact aside (~0.85fr)
- Sticky contact: `top` under site header; stays visible while scrolling description
- Mobile: single column — title/price → gallery → actions → specs → contact → description → report

## Header block (main column)

- Small red eyebrow: brand name or condition chip (keep ThrottleLK accent tracking style sparingly — prefer condition / category chip if available; otherwise keep subtle brand mark)
- Title: display font, large (`text-3xl`–`text-5xl`), uses listing title as stored
- Price: large accent (`text-accent`), primary monetary signal
- Seller: muted “Seller” label + accent link to seller profile (underline on hover only)
- Quiet meta line when data exists: year · mileage · location-style facts (no chip overload)

## Gallery

- Cover: full column width, constrained height (~420–520px), `object-cover`, light ring + soft shadow line
- Thumbnails: row under cover when `images.length > 1`; click swaps cover preview client-side
- Active thumb: accent ring
- Empty: surface panel + brand logo placeholder (same idea as listing cards)

## Specs

- Section label optional; grid of surface cells (`bg-surface`, light border)
- Each cell: muted label + bold value
- Fields: year, mileage, condition, fuel, transmission, CC; colour when present
- No decorative icons required for v1

## Actions

- Restyle existing `ListingActions` to match auth pill language:
  - Outline rounded-full buttons for favourite / compare toggle
  - Accent text link for “Compare” tray page
- Behaviour unchanged (auth redirect, compare limit message)

## Contact card (aside)

- White card: `border-black/12` + soft shadow line (same language as auth form card)
- Title: display font “Contact seller”
- Seller row: initial avatar circle + name link
- Logged in + contact visible:
  - Primary pill: Call (accent fill)
  - Secondary pill: WhatsApp (accent outline)
- Guest:
  - Two clear CTA blocks/buttons linking to login (not plain underlined sentences only)
- Logged in message form:
  - Hint, textarea with light ring, Send button (foreground or accent — prefer accent for primary action consistency)
  - Success / error / open conversation link retained

## Description + report

- “Description” section heading
- Body: readable measure, `whitespace-pre-wrap`
- `ReportListing` stays at bottom, visually quiet

## Files likely touched

- `apps/web/src/app/[locale]/bikes/[slug]/page.tsx` — layout, header, gallery shell, specs, description
- `apps/web/src/app/[locale]/bikes/[slug]/contact-panel.tsx` — card chrome + CTA hierarchy
- `apps/web/src/components/listing-actions.tsx` — button styles
- Optional small client gallery component under `apps/web/src/components/` or colocated if thumbnail swap needed
- i18n: only if new labels needed (e.g. “Description”); reuse existing keys where possible

## Success criteria

- Page no longer feels empty/flat; price, photo, and contact are obvious first
- Contact card readable on `#f5f5f5` / white and sticky on desktop
- Specs scannable in under 3 seconds
- Mobile stack order usable without horizontal squeeze
- No change to contact privacy rules (phone still gated by auth)

## Out of scope follow-ups

- Image lightbox / pinch zoom
- Similar listings carousel
- Map / district badge from richer geo payload if API already returns it later
