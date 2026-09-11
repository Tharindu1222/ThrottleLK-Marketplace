# ThrottleLK Phase 4 — Buyer Features (Favourites + Compare)

> **For agentic workers:** Implement task-by-task with smoke checks.

**Goal:** Registered buyers can favourite listings and compare up to 3 bikes side-by-side.

**Architecture:** NestJS favourites CRUD; compare is client-side selection persisted in `localStorage` (no DB required for MVP compare). Web pages under `[locale]/account/favourites` and `[locale]/compare`.

**Tech Stack:** Existing Nest + Next stack

## Tasks

1. API: favourites entity + GET/POST/DELETE endpoints
2. Web: favourite toggle on listing detail + favourites page
3. Web: compare tray (add up to 3) + compare table page
4. Header links when logged in
5. Smoke verify

---
