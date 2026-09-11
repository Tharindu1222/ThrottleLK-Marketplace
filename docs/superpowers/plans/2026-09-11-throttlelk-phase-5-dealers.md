# ThrottleLK Phase 5 — Dealer Module

> **For agentic workers:** Implement and smoke-test.

**Goal:** Sellers can apply as dealers; admins approve; public showroom pages list that dealer’s active inventory.

**Architecture:** Extend existing dealers API; add web UI for apply + showroom + admin approve dealers.

## Tasks

1. API: `GET /api/v1/dealers/mine`, `GET /api/v1/admin/dealers/pending`, listings by dealerId filter
2. Web: `/[locale]/dealers/apply`, `/[locale]/dealers/[slug]` showroom
3. Admin UI: pending dealers approve
4. Sell form: optional dealer attachment when user has active dealer
5. Smoke verify

---
