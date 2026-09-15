# ThrottleLK

Sri Lanka motorcycle & scooter marketplace — SEO-first web app (Next.js) + NestJS API.

## Prerequisites

- Node.js 22+
- Docker Desktop (Postgres only)

## Develop (recommended)

```powershell
copy .env.example .env   # first time
npm install
npm run docker:up        # Postgres in Docker → localhost:5432
# ensure SKIP_DB=false in .env
npm run dev:api          # http://localhost:3001/health
npm run dev:web          # http://localhost:3000
```

Stop DB: `npm run docker:down`

### How the API reaches Docker Postgres

Docker publishes container port `5432` on your machine as `localhost:5432`.  
Host API uses `.env`:

```env
DATABASE_URL=postgresql://throttlelk:throttlelk@localhost:5432/throttlelk
SKIP_DB=false
```

No special Docker network needed — `localhost` is enough when API runs on the host.

### Useful API paths

- `POST /api/v1/auth/register` · `POST /api/v1/auth/login`
- `GET /api/v1/brands` · `GET /api/v1/listings`
- `POST /api/v1/listings` (Bearer) → submit → admin approve

## Docs

- Product design: `docs/superpowers/specs/2026-09-11-throttlelk-product-design.md`
- Master spec: `sri_lanka_bike_marketplace_master_spec.md`
- Phase 0 plan: `docs/superpowers/plans/2026-09-11-throttlelk-phase-0-foundation.md`
- Dev Docker (Postgres): `docs/superpowers/specs/2026-09-15-docker-dev-stack-design.md`
