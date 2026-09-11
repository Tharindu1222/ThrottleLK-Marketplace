# ThrottleLK Phase 6a — Guides foundation + listing reports

> **For agentic workers:** Implement and smoke-test.

**Goal:** Ship a lightweight guides/blog surface for SEO content, and let registered users report suspicious listings.

**Architecture:** Static guide markdown-like content in `apps/web/src/content/guides`. Reports stored via Nest `reports` table + `POST /api/v1/reports`.

## Tasks

1. Guides content module + `/[locale]/guides` and `/[locale]/guides/[slug]`
2. Sitemap entries for guides; nav link
3. Reports API + report button on listing detail
4. Smoke verify

---
