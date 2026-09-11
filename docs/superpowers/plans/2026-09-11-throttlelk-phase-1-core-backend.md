# ThrottleLK Phase 1 — Core Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working NestJS API for auth, taxonomy, listings (admin approve-first), and basic dealers under `/api/v1`.

**Architecture:** Modular NestJS + TypeORM entities. JWT access (15m) + refresh (7d) in httpOnly-ready body. RBAC via roles table. Listings enter `pending_review` on submit; only admins transition to `active`/`rejected`. Public listing reads return only `active`.

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL 16, Passport JWT, bcrypt, Zod (`@throttlelk/validation`), class-validator where Nest pipes need DTOs

## Global Constraints

- Brand: **ThrottleLK**
- Listing public only when `status === 'active'` (admin approve-first)
- Hybrid contact is Phase 2 web concern; API stores `phone` / `whatsapp` on user/dealer/listing contact fields
- API base path: `/api/v1`
- `SKIP_DB` must be `false` for this phase
- Response shape: `ApiSuccess<T>` / `ApiErrorBody` from `@throttlelk/types`
- No real R2 yet — listing images accept URL metadata stubs only

## File map

```text
apps/api/src/
  common/          # filters, guards helpers
  auth/
  users/
  taxonomy/        # brands, models, locations, categories
  listings/
  dealers/
  admin/
packages/validation/src/  # register/login/listing DTOs as Zod
```

---

### Task 1: Postgres up + API global prefix

- [ ] Start Docker Desktop; `docker compose -f infrastructure/docker/docker-compose.yml up -d`
- [ ] Set `SKIP_DB=false` in `.env`
- [ ] In `main.ts`: `app.setGlobalPrefix('api/v1')` except keep `GET /health` at root OR move health to `/api/v1/health` and update README (prefer both: `/health` and `/api/v1/health`)
- [ ] Verify `Invoke-RestMethod http://localhost:3001/health` still works with DB connected

---

### Task 2: Validation schemas + User/Role entities

**Produces:** `registerSchema`, `loginSchema`; entities `User`, `Role`; many-to-many `user_roles`

- [ ] Add Zod schemas in `packages/validation`
- [ ] Unit test: register rejects bad email; login requires password min 8
- [ ] Create TypeORM `User` + `Role` entities matching master spec fields (subset OK: id uuid, names, email, phone, passwordHash, status, timestamps)
- [ ] Seed roles: `buyer`, `seller`, `dealer`, `admin` on module init

---

### Task 3: Auth module (register / login / me)

**Endpoints:**
- `POST /api/v1/auth/register` — creates user with `buyer`+`seller` roles by default
- `POST /api/v1/auth/login` — returns `{ accessToken, refreshToken, user }`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/users/me` — JWT required

- [ ] Install `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, appropriate types
- [ ] JwtAuthGuard + RolesGuard
- [ ] Tests for AuthService hash/compare and register duplicate email conflict
- [ ] Manual smoke: register → login → me

---

### Task 4: Taxonomy (brands, models, locations, categories)

**Endpoints:**
- `GET /api/v1/brands`
- `GET /api/v1/brands/:slug`
- `GET /api/v1/brands/:brandId/models`
- `GET /api/v1/locations/districts`
- `GET /api/v1/locations/districts/:districtId/cities`
- `GET /api/v1/categories`

- [ ] Entities + seed ~8 Sri Lankan-relevant brands (Honda, Yamaha, Bajaj, TVS, Suzuki, Hero, Royal Enfield, KTM) and a few models each
- [ ] Seed districts/cities (Colombo, Gampaha, Kandy, Galle minimum)
- [ ] Categories: scooter, commuter, sports, cruiser, adventure, dual-sport, electric, other

---

### Task 5: Listings + moderation

**Endpoints:**
- `POST /api/v1/listings` — auth, creates `draft`
- `PATCH /api/v1/listings/:id` — owner only, not when `active` without re-review rules: edits on `active` → back to `pending_review` OR only allow edit on draft/rejected (choose: **edit allowed on draft/rejected/paused; active edits require resubmit to pending_review**)
- `POST /api/v1/listings/:id/submit` — draft/rejected → `pending_review`
- `POST /api/v1/listings/:id/mark-sold` — owner
- `POST /api/v1/listings/:id/pause` — owner, active → paused
- `GET /api/v1/listings` — public, only `active`, filters: brand, model, district, min/max price, q
- `GET /api/v1/listings/:idOrSlug` — public if active; owner/admin can view others
- `GET /api/v1/admin/listings/pending` — admin
- `POST /api/v1/admin/listings/:id/approve` — → active, set publishedAt
- `POST /api/v1/admin/listings/:id/reject` — body `{ reason }` → rejected

- [ ] Listing entity with core fields from spec (price_lkr, year, cc, mileage, fuel, transmission, condition, district/city, status, slug)
- [ ] Service unit tests for status transitions
- [ ] Smoke: create → submit → admin approve → public GET shows it

---

### Task 6: Dealers (basic)

- [ ] Dealer entity; `POST /api/v1/dealers` creates `pending` dealer for current user
- [ ] `POST /api/v1/admin/dealers/:id/approve` → active + ensure user has dealer role
- [ ] `GET /api/v1/dealers/:slug` public only if active
- [ ] Listing may set `dealerId` when seller owns approved dealer

---

### Task 7: Seed admin user + Phase 1 verification doc

- [ ] On boot, if no admin: create `admin@throttlelk.lk` / password from `ADMIN_BOOTSTRAP_PASSWORD` env (default `ChangeMeAdmin1!` in .env.example only)
- [ ] Write `docs/superpowers/plans/PHASE1-COMPLETE.md` with curl/PowerShell smoke script results

---

## Out of scope (later phases)

Refresh cookie hardening, forgot-password email, R2 uploads, favourites/compare, Next.js auth UI, full SEO pages
