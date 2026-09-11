# Phase 8b complete — Seller profiles + account profile

**Date:** 2026-09-11

## Shipped

- `GET /api/v1/sellers/:id` — public seller card (display name, member since)
- `GET /api/v1/listings?sellerId=` filter
- Listing detail includes `seller` + link to `/sellers/[id]`
- Seller page lists active bikes
- `PATCH /api/v1/users/me` — name, phone, optional password change
- Account profile UI + header **Profile** link

## Next

- Password reset / email verification
- Launch checklist production smoke
