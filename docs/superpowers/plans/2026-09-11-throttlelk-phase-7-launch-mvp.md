# ThrottleLK Phase 7 — Launch MVP slices (A–D)

> **For agentic workers:** Execute A → B → C → D. Each slice must leave the system testable.

**Goal:** Ship email/notifications, R2 hybrid uploads, admin completeness, and launch hardening for big-bang MVP.

**Architecture:** NestJS notifications module (in-app + Resend with console fallback). Listing images storage adapter (local vs R2). Expanded admin APIs + web tabs. GitHub Actions CI + checklist.

**Tech Stack:** NestJS, TypeORM, Resend (optional key), AWS SDK S3-compatible for R2, Next.js admin UI, GitHub Actions.

## Global Constraints

- No Redis/BullMQ required yet — fire-and-forget async email
- Missing `RESEND_API_KEY` / `R2_*` → safe local fallbacks
- Preserve existing approve-first + hybrid contact behavior

## A — Notifications + email
## B — R2 hybrid
## C — Admin completeness
## D — CI + checklist
