# Phase 8f complete — Deploy + monitoring scaffolding

**Date:** 2026-09-11

## Shipped

- Root multi-stage `Dockerfile` (targets `api` and `web`)
- `infrastructure/docker/docker-compose.prod.yml`
- `npm run docker:prod`
- `/health` includes `database` + `sentry` status
- Optional Sentry (`SENTRY_DSN` on API; `instrumentation.ts` on web)
- Expanded `.env.example`

## Remaining (ops)

- Fill production secrets, Cloudflare, real listing photos, on-call
