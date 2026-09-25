# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-viewport orbit homepage with a marketplace-first cinematic first screen: compact hero, shop pillars, six bike types, latest ads, and brand/district discover.

**Architecture:** Keep existing tokens, listing/part cards, and fetch endpoints. Compose `/{locale}` as HomeHero → HomeShop → HomeMarketplacePreview → HomeDiscover. Delete the orbit and sticky hero-bridge. Compact bike-type cards so desktop first viewport shows the site map.

**Tech Stack:** Next.js 15 App Router, React Server Components, Tailwind v4, existing `t()` i18n, GSAP scroll reveals (optional, reduced-motion off).

## Global Constraints

- No new APIs; fetches stay `.catch(() => [])`.
- Visual: black / red / white cinematic, not generic classifieds.
- Hero 42–50vh (`min-height` ~320px, `max-height` ~520px), not `100svh`.
- First desktop viewport must show hero + pillars + six bike types; shrink hero toward 40vh and type cards toward ~110px if needed.
- Pillars: Bikes → `/{locale}/bikes`, Bike Parts → `/{locale}/bike-parts`, Dealers → `/{locale}/dealers`.
- Hero eyebrow/headline stay hardcoded English; new shop/discover strings EN + SI.
- Search GET `/{locale}/bikes?q=`; display font must not collide; Search and Post an Ad use body/sans + normal tracking.
- Heading order: `h1` hero, `h2` Shop / Latest / Discover, `h3` Choose your ride + cards / discover subgroups.
- Out of scope: unified search, parts-category tiles, header IA, listing card redesign, keeping orbit.

## File map

| File | Responsibility |
|------|----------------|
| `apps/web/src/lib/home-shop.ts` | Resolve bike-type hrefs/covers; `shouldShowDiscover` |
| `apps/web/src/lib/i18n.ts` | New shop/discover keys |
| `apps/web/src/components/home/home-hero.tsx` | Compact cinematic hero + search |
| `apps/web/src/components/home/hero-featured-bike.tsx` | Decorative bike image; hide on error |
| `apps/web/src/components/home/home-shop.tsx` | Pillars + compact bike types |
| `apps/web/src/components/home/home-discover.tsx` | Brands + districts; hide empty |
| `apps/web/src/components/home/bike-category-card.tsx` | `variant="compact"` |
| `apps/web/src/app/[locale]/page.tsx` | New stack |
| `apps/web/src/components/site-header.tsx` | Post an Ad sans/normal tracking |
| Delete | `hero-categories-bridge.tsx`, `hero-bike-orbit.tsx`, `hero-bike-orbit-lazy.tsx`, `bike-category-grid.tsx` |

Keep: `home-marketplace-preview.tsx`, `home-brand-grid.tsx`, `home-preview.ts`, `hero-bikes.ts`, `bike-categories.ts`, `home-scroll-reveals.tsx`.

---

### Task 1: i18n + helpers

**Files:**
- Modify: `apps/web/src/lib/i18n.ts` (EN after `homeNoPartsPreview`, SI after SI `homeNoPartsPreview`)
- Create: `apps/web/src/lib/home-shop.ts`

**Interfaces:**
- Consumes: `bikeCategories`, `Locale`
- Produces: `resolveHomeBikeTypes()`, `shouldShowDiscover()`, `HOME_PILLARS`

- [ ] **Step 1: Add i18n keys** (EN + SI): `homeShopTitle`, `homeShopSubtitle`, `homeShopNav`, `homePillarBikes`, `homePillarBikesPromise`, `homePillarParts`, `homePillarPartsPromise`, `homePillarDealers`, `homePillarDealersPromise`, `homeChooseRide`, `homeChooseRideSubtitle`, `homeDiscoverTitle`, `homeDiscoverBrands`, `homeDiscoverBrandsSubtitle`, `homeDiscoverDistricts`, `homeDiscoverDistrictsSubtitle`.

- [ ] **Step 2: Add `home-shop.ts`**

```ts
export function shouldShowDiscover(
  brands: readonly unknown[],
  districts: readonly unknown[],
): boolean {
  return brands.length > 0 || districts.length > 0;
}

export function resolveHomeBikeTypes(apiCategories: HomeApiCategory[]): ResolvedHomeBikeType[]
```

Href: `/${locale}/bikes?categoryId=` when a public category matches `taxonomySlugs`; else `/${locale}/bikes`. Cover from matching `coverImageUrl` or marketing SVG.

- [ ] **Step 3: Commit** (only if the user asked for commits)

---

### Task 2: Compact cards + HomeShop + HomeHero

**Files:**
- Modify: `bike-category-card.tsx` — add `variant?: 'default' | 'compact'`
- Create: `hero-featured-bike.tsx`, `home-shop.tsx`
- Rewrite: `home-hero.tsx`

**Interfaces:**
- Consumes: `resolveHomeBikeTypes`, `HOME_PILLARS`, `HERO_BIKES[0]`, `t()`
- Produces: visible first-screen shop + readable hero

- [ ] Compact card height ~110px; `lg` grid 6 columns, small screens 2.
- [ ] HomeShop: section `h2` shop title; `nav aria-label={t(homeShopNav)}` three pillar links; `h3` choose ride; compact cards.
- [ ] HomeHero: 42–50vh band, one bike, search form, display headline with `tracking-normal` (not `tracking-tight`), Search button sans.
- [ ] Featured bike `alt=""`; `onError` hides image.

---

### Task 3: Discover + page compose + delete unused

**Files:**
- Create: `home-discover.tsx`
- Rewrite: `apps/web/src/app/[locale]/page.tsx`
- Modify: `site-header.tsx` Post an Ad classes
- Delete orbit/bridge/old grid after no remaining imports

- [ ] Discover returns `null` if both lists empty; hide empty subgroup only.
- [ ] Page: Hero → Shop → scroll-reveal(Latest, Discover). No `HeroCategoriesBridge`.
- [ ] Desktop first viewport must include pillars + types.

---

### Task 4: Verify

- [ ] Typecheck / lint touched files
- [ ] Browser: 1440 desktop first screen; 390 mobile; search; pillar/type/brand/district links; SI wrap; keyboard; reduced-motion; no glyph collision on `Find Your Ride.` / Search / Post an Ad
