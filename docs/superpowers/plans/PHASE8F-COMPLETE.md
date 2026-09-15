# Phase 8f complete — Deploy + monitoring scaffolding

**Date:** 2026-09-11

## Shipped

- `/health` includes `database` + `sentry` status
- Optional Sentry (`SENTRY_DSN` on API; `instrumentation.ts` on web)
- Expanded `.env.example`

## Removed (development phase)

- Production Docker stack (`Dockerfile`, `docker-compose.prod.yml`, `npm run docker:prod`) — reintroduce when ready to deploy

## Remaining (ops)

- Fill production secrets, Cloudflare, real listing photos, on-call
