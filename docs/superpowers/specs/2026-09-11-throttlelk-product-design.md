# ThrottleLK Product Design

**Date:** 2026-09-11  
**Brand:** ThrottleLK  
**Market:** Sri Lanka (motorcycles & scooters)  
**Source:** `sri_lanka_bike_marketplace_master_spec.md` + brainstorming decisions

---

## 1. Product definition

ThrottleLK is a Sri Lanka–only motorcycle and scooter marketplace. Private sellers and dealers both list from day one. Buyers browse, filter, compare, save favourites, and contact sellers. v1 does **not** include in-app payments, escrow, valuation, physical inspection, live chat, or a native mobile app.

**Launch model:** Big-bang. Public launch only when the full Section 67 MVP (plus decisions below) is ready. Staging stays non-indexable until launch.

**90-day success:** Supply-first — target ~100–500 quality live listings and several active dealers, even if traffic is still modest.

**Competitive moat (all three):**
1. Bike-native filters and taxonomy (brand, model, cc, type, year, condition)
2. Trust via admin moderation and dealer approval
3. SEO discovery via brand / model / location landing pages

---

## 2. Users and roles

| Role | Launch capability |
|---|---|
| Guest buyer | Browse, search, filter, view details, compare, contact via form, share |
| Registered buyer | All guest actions + see phone/WhatsApp, favourites, saved searches, profile |
| Private seller | Create/edit/pause/sold listings, photos, basic performance |
| Dealer | Profile/showroom, multi-listing inventory, dealer dashboard |
| Admin | Moderation queue, users, dealers, brands/models/locations, reports |

---

## 3. Contact and trust

**Hybrid contact**
- Guests: contact form only (email/SMS or in-app notification to seller). Phone not shown.
- Registered buyers: phone and WhatsApp CTA visible on listing/seller.

**Moderation**
- Admin approve-first: no listing is public until an admin approves it.
- Sellers can correct and resubmit after rejection (rejection includes a reason).
- New dealers require admin approval before showroom/listings are public (aligned with dealer approval in MVP admin).

---

## 4. Language and brand

- **Brand:** ThrottleLK
- **UI locales at launch:** English + Sinhala (`en`, `si`)
- **Tamil:** deferred
- Listing content may be entered in any language; UI chrome is EN/SI

---

## 5. MVP scope (ship before public launch)

Matches master spec §67, with product decisions above applied:

**Public:** Home, browse, search, filters, brand/model pages, listing detail, seller profile, dealer profile, compare, contact seller, blog/guide foundation  

**Account:** Login, register, profile, favourites, my listings, add/edit listing, mark sold  

**Admin:** Dashboard, listing moderation, users, dealer approval, brand/model/location management, reports  

**Infra:** Next.js, NestJS, PostgreSQL, R2, Cloudflare, email, monitoring, CI/CD (Redis optional initially)

**Explicitly deferred:** native app, valuation, inspection, payments/escrow, auctions, live chat, AI features, finance/insurance APIs, spare-parts marketplace

---

## 6. Architecture

```text
Cloudflare (CDN/WAF/DNS) → Nginx (VPS) → Next.js (web) + NestJS (api)
                                      → PostgreSQL + Redis (optional MVP)
                                      → BullMQ workers
                                      → Cloudflare R2 (images)
```

- **Monorepo:** `apps/web`, `apps/api`, `apps/admin` (admin may start as routes in web if faster; prefer separate app when ready), `packages/{ui,types,validation,config}`
- **API-first / stateless:** same NestJS API for future mobile
- **Search Phase 1:** PostgreSQL + `pg_trgm`; Phase 2 search engine later
- **Auth:** JWT access + refresh, RBAC
- **Rendering:** SEO-first Next.js App Router (ISR for listing/brand/model pages)

---

## 7. Listing status workflow

```text
draft → pending_review → active
                      → rejected → (edit) → pending_review
active → paused | sold | expired
```

Only `active` listings are publicly indexable and browsable.

---

## 8. Delivery phases (implementation plans)

| Plan | Focus |
|---|---|
| Phase 0 | Repo, tooling, apps scaffold, DB, CI skeleton |
| Phase 1 | Auth, users/roles, taxonomy, listings, images, moderation API |
| Phase 2 | Public web UI (home, browse, detail, contact, seller/dealer pages) |
| Phase 3 | SEO pages, metadata, sitemap, JSON-LD, i18n EN/SI |
| Phase 4 | Favourites, compare, saved searches, notifications |
| Phase 5 | Dealer module polish + admin console completeness |
| Phase 6 | Perf, security, a11y, load tests, launch checklist |

Each phase gets its own implementation plan and must leave the system in a testable state.

---

## 9. Non-goals for Phase 0

No production UI polish, no real R2/Cloudflare wiring required beyond env placeholders, no full feature implementation — foundation only.
