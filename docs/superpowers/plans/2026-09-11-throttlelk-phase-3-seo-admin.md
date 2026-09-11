# ThrottleLK Phase 3 — SEO + Admin Moderation UI

> **For agentic workers:** Use executing-plans / implement task-by-task.

**Goal:** Indexable brand/model/district landing pages with metadata + sitemap/robots, and a browser admin queue to approve/reject pending listings.

**Architecture:** Next.js SSR/ISR pages under `[locale]` consuming taxonomy + listings APIs. Admin UI at `/[locale]/admin` gated client-side by JWT + `admin` role (API already enforces RBAC).

**Tech Stack:** Next.js App Router, existing Nest API

## Tasks

1. SEO metadata helpers + JSON-LD on listing detail
2. Brand page `/[locale]/brands/[slug]` with listings filtered by brand
3. District page `/[locale]/locations/[slug]`
4. `app/sitemap.ts` + `app/robots.ts`
5. Admin pending queue UI (login as admin → approve/reject)
6. Home/browse internal links to brand & location hubs

---
