# Local Docker — Postgres only

**Date:** 2026-09-15  
**Status:** Active

## Goal

Fast local development: Postgres in Docker; API + Web on the host via npm.

## Commands

```powershell
npm run docker:up    # start Postgres (-d)
npm run docker:down
npm run dev:api
npm run dev:web
```

## How host API talks to Docker DB

```
[ npm run dev:api ]  --DATABASE_URL-->  localhost:5432  --Docker port map-->  postgres:5432
```

Compose publishes `5432:5432`. `.env` uses:

`DATABASE_URL=postgresql://throttlelk:throttlelk@localhost:5432/throttlelk`

## Out of scope

- Full-stack API/Web containers (slow on Windows bind mounts)
