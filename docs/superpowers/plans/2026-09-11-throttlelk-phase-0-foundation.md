# ThrottleLK Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a working ThrottleLK monorepo with Next.js web, NestJS API, shared packages, Postgres via Docker, and a green local smoke check — ready for Phase 1 auth/listings.

**Architecture:** npm workspaces monorepo. `apps/web` (Next.js App Router) and `apps/api` (NestJS) share `packages/types` and `packages/validation`. PostgreSQL runs in Docker Compose for local dev. Admin remains deferred as routes-in-web until Phase 5 unless needed earlier.

**Tech Stack:** Node 22+, TypeScript, Next.js 15, NestJS 11, TypeORM, PostgreSQL 16, Tailwind CSS, Zod, Docker Compose, ESLint/Prettier

## Global Constraints

- Brand name in UI/copy: **ThrottleLK** (not "bike marketplace")
- Locales planned: `en`, `si` (scaffold i18n routing in web; full strings in Phase 3)
- API must be independently runnable from web
- No secrets committed; use `.env.example` only
- Master product rules live in `docs/superpowers/specs/2026-09-11-throttlelk-product-design.md`
- Prefer Windows-friendly scripts (PowerShell / cross-env)

## File map

```text
throttlelk/   (repo root = d:\bikers marketplace)
├── apps/
│   ├── web/                 # Next.js App Router
│   └── api/                 # NestJS REST API
├── packages/
│   ├── types/               # Shared TS types
│   └── validation/          # Shared Zod schemas
├── infrastructure/
│   └── docker/
│       └── docker-compose.yml
├── docs/
├── package.json             # workspaces root
├── .gitignore
├── .env.example
└── README.md
```

---

### Task 1: Git + root workspace

**Files:**
- Create: `.gitignore`, `package.json`, `.env.example`, `README.md`

- [x] **Step 1: Initialize git** (done — `development` branch)
- [x] **Step 2: Create `.gitignore`**
- [x] **Step 3: Create root `package.json`**
- [x] **Step 4: Create `.env.example`**
- [x] **Step 5: Create `README.md`**
- [x] **Step 6: Verify**

---

### Task 2: Shared packages (`types`, `validation`)

**Files:**
- Create: `packages/types/package.json`, `packages/types/tsconfig.json`, `packages/types/src/index.ts`
- Create: `packages/validation/package.json`, `packages/validation/tsconfig.json`, `packages/validation/src/index.ts`, `packages/validation/src/listing-status.test.ts`

**Interfaces:**
- Produces: `ListingStatus` type and Zod enum; `ApiSuccess` / `ApiError` response shapes

- [ ] **Step 1: Create `@throttlelk/types`**

`packages/types/src/index.ts`:

```typescript
export type Locale = 'en' | 'si';

export type UserRole = 'buyer' | 'seller' | 'dealer' | 'admin';

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'rejected'
  | 'paused'
  | 'sold'
  | 'expired';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

- [ ] **Step 2: Create `@throttlelk/validation` with Zod `listingStatusSchema` and a unit test that accepts `pending_review` and rejects `published`**

- [ ] **Step 3: `npm install` from root; run validation test — expect PASS**

---

### Task 3: Docker Postgres

**Files:**
- Create: `infrastructure/docker/docker-compose.yml`

- [ ] **Step 1: Write compose file** with `postgres:16-alpine`, user/password/db `throttlelk`, port `5432`, volume `throttlelk_pg`

- [ ] **Step 2: Start Postgres**

```powershell
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Expected: container healthy/running

- [ ] **Step 3: If Docker unavailable**, document in README that Postgres must be local and continue with API using `DATABASE_URL`; do not block remaining scaffold

---

### Task 4: NestJS API scaffold

**Files:**
- Create: `apps/api/**` via Nest CLI or manual minimal app
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `GET /health` → `{ success: true, data: { status: "ok", service: "throttlelk-api" } }`
- Produces: TypeORM wired to `DATABASE_URL` (synchronize off in production; on for local Phase 0 only with clear comment)

- [ ] **Step 1: Scaffold NestJS app named `@throttlelk/api` on port 3001**

- [ ] **Step 2: Add HealthController returning ApiSuccess shape**

- [ ] **Step 3: Add TypeORM PostgreSQL connection from env**

- [ ] **Step 4: Add e2e or unit test for health endpoint — FAIL then PASS**

- [ ] **Step 5: Run API and curl health**

```powershell
npm run dev:api
# other terminal:
Invoke-RestMethod http://localhost:3001/health
```

Expected: `success: True`, `data.status: ok`

---

### Task 5: Next.js web scaffold

**Files:**
- Create: `apps/web/**` Next.js App Router + Tailwind
- Create: `apps/web/src/app/[locale]/page.tsx` with locales `en` | `si`
- Create: brand home hero showing **ThrottleLK**

- [ ] **Step 1: Scaffold Next.js TypeScript App Router app `@throttlelk/web`**

- [ ] **Step 2: Add `[locale]` segment; default redirect `/` → `/en`**

- [ ] **Step 3: Home page shows brand name ThrottleLK and short tagline (EN copy for now; SI string placeholder key ok)**

- [ ] **Step 4: Fetch `/health` from API in a server component or route handler smoke page optional — at minimum document API_URL**

- [ ] **Step 5: `npm run dev:web` — open `http://localhost:3000/en` — expect ThrottleLK visible

---

### Task 6: Smoke verification + handoff note

- [ ] **Step 1: From root, `npm install` and `npm run build` (or build types/validation + api + web as available)**

- [ ] **Step 2: Confirm health + home page work**

- [ ] **Step 3: Write `docs/superpowers/plans/PHASE0-COMPLETE.md` checklist of what was verified and point next plan to Phase 1 (auth + listings)**

---

## Self-review notes

- Spec coverage for Phase 0 only: brand, monorepo, stack, listing status type, locales scaffold — yes
- Full MVP features intentionally out of scope
- No TBD placeholders in tasks
