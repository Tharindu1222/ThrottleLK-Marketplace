# Homepage redesign — marketplace-first cinematic

**Date:** 2026-09-25  
**Status:** Approved for planning  
**Context:** The homepage already has a cinematic hero, bike categories, latest bikes/parts, brands, and districts. First impression fails: a 100vh orbit hero hides what the site sells, display type collides (`Findyour Ridee`, `Searchher`), and categories sit below the fold.

## Goal

A first-time visitor should understand, without scrolling on a typical desktop viewport, that this is Sri Lanka’s motorbike marketplace and that they can shop **bikes**, **bike parts**, and **dealers**, then narrow by bike type. After that, live latest ads and brand/district filters keep them browsing.

## Decisions (locked)

- **First screen:** Marketplace-first. Compact hero + search + site pillars + six bike types in the first desktop viewport.
- **Visual tone:** ThrottleLK cinematic compressed — keep black / red / white, display headline, one dramatic bike image. Do not switch to a generic classifieds look.
- **Category set:** Three site pillars (Bikes, Bike Parts, Dealers) plus the existing six public bike types (Scooters, Street, High Capacity, Trail, Classic, Electric).
- **Architecture:** Approach 1 — stacked marketplace canvas. Remove the full-viewport orbit carousel and the sticky GSAP hero-bridge.
- **Scope:** Public homepage (`/{locale}`) and the home components it composes. No new APIs. No header/nav IA change. No listing/part card redesign.

## Current state

| Area | Today |
|------|--------|
| `HomeHero` | `100svh` cinematic split, orbit of 5 bikes, search → `/{locale}/bikes` |
| `HeroCategoriesBridge` | Sticky hero; categories rise over it with GSAP fade |
| `BikeCategoryGrid` | Six tall photo cards (220–260px), below the fold |
| `HomeMarketplacePreview` | Latest 8 bikes + 8 interleaved parts |
| Brands / districts | Sequential blocks at the bottom |
| Typography | Display font + tight tracking collides on hero (and may affect header if same treatment) |

## Design

### 1. Page stack

`main` children, top to bottom:

1. Existing site header (unchanged chrome).
2. Compact cinematic hero.
3. Shop the marketplace (pillars + bike types).
4. Latest bikes.
5. Latest parts.
6. Discover (brands + districts, desktop side-by-side).
7. Existing footer.

On a 1366×768 or 1440×900 desktop window, items 2–3 must be visible without scrolling. If they do not fit, shrink the hero toward 40vh and bike-type cards toward ~110px — do not push bike types below the fold on desktop. On a 390px phone, hero + pillars are visible; bike types may wrap below the fold.

Remove from the homepage: `HeroCategoriesBridge`, `HeroBikeOrbit` / `HeroBikeOrbitLazy`. Do not keep a hidden orbit for later.

### 2. Compact hero

- Height: about **42–50vh**, `min-height` ~320px, `max-height` ~520px. Not `100svh`.
- Layout: left copy + search; right **one** featured bike (`HERO_BIKES[0]`). Image is decorative (`alt=""`). If the image fails, keep the gradient/split and hide the broken image — headline and search always remain.
- Keep the black / white diagonal split and red speed bars, scaled to the shorter band. Drop the city-silhouette decoration if it fights the shorter crop.
- Copy (EN): eyebrow `Sri Lanka's Motorbike Marketplace`; headline `Find Your Ride.`; supporting line stays the existing marketplace sentence.
- Search: `role="search"`, visible accessible name (visible label or `sr-only` tied to the input), `type="search"`, `name="q"`, GET to `/{locale}/bikes`. Placeholder reuses `searchPlaceholder`. Submit label reuses `search`.
- **Typography fix (required):** Display font must not collide or double glyphs. Headline uses display with enough tracking and word spacing that `Find Your Ride.` reads as three words. Search button uses the body/sans stack and normal tracking — not display + wide tracking. Verify the header nav if the same font treatment is doubling letters (`Buy Bikes`, `Bike Parts`, `Dealers`, `Post an Ad`); fix that treatment if it is the same bug, without redesigning the header.

### 3. Shop the marketplace

One `<section>` with heading **Shop the marketplace** (i18n EN + SI).

**Pillars** — `<nav aria-label="Shop">` with three equal compact cards:

| Pillar | Href | Promise (EN) |
|--------|------|----------------|
| Bikes | `/{locale}/bikes` | Browse motorbikes for sale |
| Bike Parts | `/{locale}/bike-parts` | Spares and modified parts |
| Dealers | `/{locale}/dealers` | Showrooms and parts shops |

Each pillar: title + one-line promise + hover/focus accent edge. Not tall photo cards. Sinhala labels wrap; do not truncate titles.

**Bike types** — heading **Choose your ride**. Same six marketing categories and `categoryId` href logic as today’s `BikeCategoryGrid`. Cards ~140px tall (image + name + short line). One row on `lg+`; two columns on small screens.

### 4. Latest ads

Keep `HomeMarketplacePreview` behavior:

- Bikes: `/api/v1/listings?limit=8&sort=newest`
- Parts: spare + modified interleaved via `pickPreviewItems` to 8
- Existing `ListingCard` / `PartCard`, favourite off
- Empty: existing empty copy + browse link
- Fetch failures already degrade to `[]` — keep that

### 5. Discover

Wrap brands + districts in **Discover**.

- Desktop: two columns (brands | districts).
- Mobile: stack, brands first.
- Brands: existing logo grid; missing logo shows the name.
- Districts: chip links to `/{locale}/bikes?districtId=`.
- If brands array is empty, hide the brands subgroup. If districts array is empty, hide the districts subgroup. If both empty, hide the whole Discover section.

### 6. Motion and accessibility

- Optional light scroll-reveal on sections below the hero. Off when `prefers-reduced-motion: reduce`.
- No orbit, no sticky hero cover, no scale-fade that leaves empty gutters.
- Real `<a>` for navigation, real `<button>` for search submit.
- Existing global `:focus-visible` accent ring stays.
- Hover is not the only affordance: border + accent edge + text.
- Heading order: `h1` in hero, `h2` for Shop / Latest bikes / Latest parts / Discover, `h3` for cards.
- Landmarks: `main`, search form, Shop `nav`. Unique `aria-label`s if multiple `nav`s exist on the page.

### 7. i18n

Add EN + SI strings for: shop section heading, three pillar titles, three pillar promises, discover heading (if not already present). Reuse existing keys for search, latest bikes/parts, browse-all, empty previews.

Keep the hero eyebrow and headline hardcoded English, matching today’s `HomeHero`. Do not leave new shop/discover strings untranslated.

### 8. Data and errors

No new endpoints. Homepage continues to fetch brands, districts, listings, spare parts, modified parts, and public categories in parallel with `.catch(() => [])`.

Public categories still drive bike-type covers and `categoryId` query params. Marketing slugs stay in `bike-categories.ts`.

## Files (expected)

| Change | Path |
|--------|------|
| Compose new stack | `apps/web/src/app/[locale]/page.tsx` |
| Rewrite compact hero | `apps/web/src/components/home/home-hero.tsx` |
| New shop section | `apps/web/src/components/home/home-shop.tsx` — pillars + bike-type grid in one section |
| Compact type cards | `apps/web/src/components/home/bike-category-card.tsx` — add a compact variant; keep the current card API for any non-home use |
| Discover wrapper | `apps/web/src/components/home/home-discover.tsx` |
| i18n keys | `apps/web/src/lib/i18n.ts` |
| Delete unused | `hero-categories-bridge.tsx`, `hero-bike-orbit.tsx`, `hero-bike-orbit-lazy.tsx` after confirming no other imports |

Keep `home-marketplace-preview.tsx`, `home-brand-grid.tsx`, `home-preview.ts`, `hero-bikes.ts`, `bike-categories.ts`.

## Testing

- `pickPreviewItems` unit tests stay green.
- Homepage renders with all fetches mocked empty: no crash; empty latest sections show recovery links; Discover hidden if both lists empty.
- Pillar hrefs: `/bikes`, `/bike-parts`, `/dealers` for the active locale.
- Bike-type hrefs include `categoryId` when the public category exists.
- Brand and district links keep current query params.
- Browser on the running app: first desktop viewport shows hero + pillars + bike types; search submits to bikes browse; keyboard tabs search → pillars → types; Sinhala wrap; 390px and 1440px; reduced-motion; `Find Your Ride.` and Search do not collide.

## Out of scope

- Unified search across bikes + parts
- Parts category tiles on the homepage
- New dealer or parts APIs
- Header/nav information architecture
- Listing/part card visual redesign
- Reworking the orbit as an optional extra

## Success

A new visitor can answer, from the first screen: what this site is, what they can buy, and how to start — then see real latest ads and filter by brand or district without hunting.
