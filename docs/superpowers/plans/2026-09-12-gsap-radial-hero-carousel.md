# GSAP Radial Hero Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GSAP half-orbit motorbike carousel to the homepage hero right side, plus light ScrollTrigger reveals below the fold.

**Architecture:** Client `HeroBikeOrbit` tweens a shared angle; bikes positioned with polar math. `HomeHero` left side unchanged. Optional `HomeScrollReveals` for category/brand sections.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, gsap (+ ScrollTrigger)

## Global Constraints

- Left hero copy/CTAs unchanged
- Red/black/white tokens only
- Homepage only
- Autoplay ~4s + prev/next arrows; pause on hover/focus
- `prefers-reduced-motion`: static focus bike
- Five images from `/images/bike/`

---

### Task 1: Install gsap + bike manifest

- [ ] `npm install gsap -w @throttlelk/web`
- [ ] Create `apps/web/src/lib/hero-bikes.ts` with ordered paths for the 5 PNGs

### Task 2: HeroBikeOrbit component

- [ ] Create `apps/web/src/components/home/hero-bike-orbit.tsx`
- [ ] Polar layout, GSAP angle tween, arrows, autoplay, reduced motion

### Task 3: Wire HomeHero

- [ ] Replace SVG/placeholder arrows with `<HeroBikeOrbit />` on the right

### Task 4: Scroll reveals

- [ ] Create `home-scroll-reveals.tsx` and wrap homepage below-fold sections

### Task 5: Verify

- [ ] `npx tsc -p apps/web/tsconfig.json --noEmit`
- [ ] Smoke-check homepage in browser if dev server available
