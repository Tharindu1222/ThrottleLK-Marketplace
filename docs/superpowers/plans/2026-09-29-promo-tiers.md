# Promo Tiers (Boost / Featured / Premium) Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkboxes track progress.

**Goal:** Admin-configurable Boost/Featured/Premium packages with surfaces (home/browse/detail) and priority; public rails on home, browse, and detail for bikes + parts.

**Spec:** `docs/superpowers/specs/2026-09-29-promo-tiers-boost-featured-premium-design.md`

**Architecture:** Extend `promo_packages` + `homepage_placements` with tier/surfaces/priority snapshot; filter/sort by surface; admin + seller UI; public Promoted sections.

---

### Task 1: Schema + validation + entities
### Task 2: Service serving + approve snapshot + live-by-surface API
### Task 3: Admin packages UI
### Task 4: Seller promote cards
### Task 5: Public home/browse/detail rails
### Task 6: Seed defaults + tests
