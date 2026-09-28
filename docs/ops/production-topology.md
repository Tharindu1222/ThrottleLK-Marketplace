# ThrottleLK production topology

Public hostname (example: `www.throttlelk.lk`) terminates TLS at nginx.
The browser talks to **one origin** so auth cookies stay first-party.

```
Internet
   │
   ▼
nginx :443
   ├── /api/v1/*  →  Nest API 127.0.0.1:3001
   └── /*         →  Next.js  127.0.0.1:3000
```

Same-origin `/api/v1` is required for `__Host-tlk_access` / `__Host-tlk_refresh`
(HttpOnly, Secure, Path=/, no Domain). Next.js also rewrites `/api/v1` as a
dev/fallback path; production should prefer the nginx split.

## Process layout

- Postgres 16 (private network only; not published to the internet)
- Redis (optional cache)
- API: `NODE_ENV=production`, `TRUST_PROXY=true`, unique JWT secrets ≥32 chars
- Web: `NEXT_PUBLIC_SITE_URL=https://www.throttlelk.lk`
- Resend: `RESEND_API_KEY` and `EMAIL_FROM` must be set (API refuses email in production without them)

See `infrastructure/nginx/throttlelk.conf` and `infrastructure/scripts/deploy.sh`.
