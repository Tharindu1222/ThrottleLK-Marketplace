# ThrottleLK Phase 2 — Public Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development.

**Goal:** Ship a usable ThrottleLK web UI for browse, listing detail, hybrid contact, auth, and seller create/list flows against the Phase 1 API.

**Architecture:** Next.js App Router under `apps/web/src/app/[locale]/…`. Server components fetch public data from Nest; client components handle auth token in `localStorage` + filter forms. Shared copy maps for `en`/`si`.

**Tech Stack:** Next.js 15, Tailwind, fetch API client, no TanStack Query yet (add later if needed)

## Global Constraints

- Brand **ThrottleLK** dominant in header/hero
- Hybrid contact: guests see form only; registered users see phone/WhatsApp
- Only `active` listings appear in public browse
- Locales: `en`, `si`
- Avoid purple AI-slop theme; keep asphalt/amber direction from Phase 0 home

## Tasks

### Task 1: Web API client + env
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `lib/api.ts` helpers for public + authenticated fetch

### Task 2: Site chrome
- Shared header/footer with brand, Browse, Sell, Login links, locale switch

### Task 3: Browse + filters
- `/[locale]/bikes` lists active listings with brand/district/q/price filters

### Task 4: Listing detail + hybrid contact
- `/[locale]/bikes/[slug]`
- Guest: contact form → `POST /api/v1/listings/:id/contact`
- Registered: show phone/WhatsApp buttons

### Task 5: Auth pages
- `/[locale]/login`, `/[locale]/register` store tokens, redirect

### Task 6: Seller dashboard lite
- `/[locale]/sell` create listing form
- `/[locale]/account/listings` my listings + submit action

### Task 7: API contact endpoint + optional auth listing list for seller
- `POST /api/v1/listings/:id/contact`
- `GET /api/v1/listings/mine` (seller’s listings)

---
