# GSAP radial motorbike hero carousel (ThrottleLK)

**Date:** 2026-09-12  
**Status:** Approved for implementation planning  
**Scope:** Homepage only (A)

## Goal

Fill the empty right side of the existing hero with a premium **radial / half-orbit motorbike carousel** driven by GSAP. Left-side copy and CTAs stay unchanged. Preserve red / black / white identity.

## Non-goals

- Redesigning left hero content or diagonal split layout
- Animating browse / dealers / sell / account / admin
- Playful ecommerce-style slide carousels
- Requiring scroll to advance bikes in the hero

## Libraries

- **gsap** — orbit angle tween, scale/opacity, autoplay timing
- **ScrollTrigger** (gsap plugin) — light one-shot reveals for category / brand / district sections below the hero only
- No Framer Motion for this feature

## Visual composition

### Hero (unchanged left)

- Eyebrow, H1 (“Find Your Ride.”), supporting text, Browse / Sell CTAs remain as today.

### Hero right — radial stage

- Overflow-hidden stage over the light/white side of the split.
- Large circular orbit; **only ~half of the arc is visible** (circle center sits partly outside the viewport/container — mechanical wheel feel).
- Five transparent bike PNGs from `apps/web/public/images/bike/` placed on the orbit.
- **One dominant bike** at the focus position (bottom-center of the visible arc): largest scale, full opacity, soft ground shadow.
- Neighbors smaller and dimmer; far positions clipped or heavily faded by the stage mask.
- Existing red / gray speed bars and ground line stay behind the bikes; decorative ‹ › placeholders become real controls.

### Motion character

Smooth, premium, mechanical, cinematic, controlled — not playful.

## Interaction

- **Autoplay:** advance one step every ~4 seconds.
- **Arrows:** previous / next; each click resets the autoplay timer.
- **Pause:** autoplay pauses on hover over the stage and when focus is inside carousel controls.
- **Step:** `360° / 5` per advance; tween duration ~1.0–1.2s with `power2.inOut` or `power3.inOut`.
- **Reduced motion:** if `prefers-reduced-motion: reduce`, show only the focus bike (no orbit tween, no autoplay).

## Below-fold (homepage)

- Category grid (“Choose Your Ride”) and Discover brand / district blocks: short fade/up stagger via ScrollTrigger (`once: true`, ~0.5–0.7s, `power2.out`).
- Skip under reduced motion.

## Technical approach

1. Shared rotation angle θ; each bike at `θ + i * (2π/5)`.
2. Position: `x = cx + r * cos(φ)`, `y = cy + r * sin(φ)` (screen Y adjusted so focus lands on the visible bottom arc).
3. Visual weight from angular distance to focus: scale and opacity falloff.
4. GSAP tweens θ (or a proxy object) on step; kill/replace in-flight tweens on rapid arrow clicks.
5. Client-only component; SSR renders static first bike / markup safe for hydration.

## Files

| Path | Role |
|------|------|
| `apps/web/package.json` | Add `gsap` dependency |
| `apps/web/src/lib/hero-bikes.ts` | Ordered image paths + alt text for 5 bikes |
| `apps/web/src/components/home/hero-bike-orbit.tsx` | Client radial carousel (GSAP) |
| `apps/web/src/components/home/home-hero.tsx` | Keep left; mount orbit on right |
| `apps/web/src/components/home/home-scroll-reveals.tsx` | Optional client wrapper for below-fold reveals |
| `apps/web/src/app/[locale]/page.tsx` | Wire reveals if needed without changing data fetching |

Asset filenames may stay as-is under `/images/bike/…`; optional short renames are cosmetic only.

## Accessibility

- Arrow buttons: clear accessible names (e.g. “Previous bike”, “Next bike”).
- Stage / region labeled appropriately (e.g. “Featured motorbikes”).
- Keyboard operable; autoplay pauses while focused in controls.
- Optional polite live region for “Bike N of 5” on change.

## Acceptance criteria

- [ ] Left hero copy/CTAs visually unchanged aside from shared token inheritance.
- [ ] Right side shows half-orbit of 5 real bike images; one dominant at a time.
- [ ] Smooth GSAP rotation on autoplay and arrows; autoplay pauses on hover/focus.
- [ ] Reduced-motion users see a static focus bike.
- [ ] Category / brand sections reveal once on scroll (homepage only).
- [ ] No new motion libraries beyond gsap; TypeScript builds cleanly.
