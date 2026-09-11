# ThrottleLK

Sri Lanka motorcycle & scooter marketplace — SEO-first web app (Next.js) + NestJS API.

## Prerequisites

- Node.js 22+
- Docker Desktop (for local PostgreSQL), or a local Postgres 16 instance

## Setup

```powershell
copy .env.example .env
npm install
docker compose -f infrastructure/docker/docker-compose.yml up -d
# Then set SKIP_DB=false in .env
# If Docker is unavailable, leave SKIP_DB=true (API health still works; DB features need Postgres)
```

## Develop

```powershell
npm run dev:api   # http://localhost:3001/health  +  /api/v1/*
npm run dev:web   # http://localhost:3000/en
```

### Useful API paths

- `POST /api/v1/auth/register` · `POST /api/v1/auth/login`
- `GET /api/v1/brands` · `GET /api/v1/listings`
- `POST /api/v1/listings` (Bearer) → submit → admin approve

## Docs

- Product design: `docs/superpowers/specs/2026-09-11-throttlelk-product-design.md`
- Master spec: `sri_lanka_bike_marketplace_master_spec.md`
- Phase 0 plan: `docs/superpowers/plans/2026-09-11-throttlelk-phase-0-foundation.md`
