# Phase 1 complete — Core backend

**Date:** 2026-09-11

## Verified smoke flow

```text
GET  /health                         → ok
GET  /api/v1/brands                  → 8 brands seeded
POST /api/v1/auth/login (admin)      → token
POST /api/v1/auth/register (seller)  → token
POST /api/v1/listings                → draft
GET  /api/v1/listings                → 0 (not public yet)
POST /api/v1/listings/:id/submit     → pending_review
POST /api/v1/admin/listings/:id/approve → active
GET  /api/v1/listings                → 1 public listing
```

## Bootstrap admin

- Email: `admin@throttlelk.lk` (from `ADMIN_BOOTSTRAP_EMAIL`)
- Password: `ADMIN_BOOTSTRAP_PASSWORD` in `.env` (change before any real deploy)

## Postgres

```powershell
docker compose -f infrastructure/docker/docker-compose.yml up -d
# SKIP_DB=false in .env
```

## Next

**Phase 2 — Public web:** browse/search UI, listing detail, contact hybrid (guest form / registered phone), seller create-listing forms, auth UI.
