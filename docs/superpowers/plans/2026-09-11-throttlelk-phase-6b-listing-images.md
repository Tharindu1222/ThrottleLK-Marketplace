# ThrottleLK Phase 6b — Listing image uploads

> **For agentic workers:** Implement and smoke-test.

**Goal:** Sellers can attach photos to listings; browse/detail show a cover image.

**Architecture:** `listing_images` entity. Dev: multipart upload to `apps/api/uploads` served at `/uploads`. Prod-ready path: when `R2_*` env vars exist, generate signed PUT URLs (stub interface). First image becomes cover.

## Tasks

1. ListingImage entity + upload/list/delete/cover endpoints
2. Serve local uploads in Nest; wire images into listing GET payloads
3. Web: upload UI on sell + my listings; show cover on cards/detail
4. Smoke verify

---
