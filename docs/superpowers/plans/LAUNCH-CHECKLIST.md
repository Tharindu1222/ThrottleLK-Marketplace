# ThrottleLK launch checklist

## Pre-launch

- [ ] Set production `JWT_*` secrets (long random)
- [ ] Set `DATABASE_URL` to managed Postgres
- [ ] Set `RESEND_API_KEY` + verified `EMAIL_FROM`
- [ ] Set Cloudflare `R2_*` and public bucket URL
- [ ] Set `WEB_URL` / `API_URL` / `NEXT_PUBLIC_*` to production hosts
- [ ] `NODE_ENV=production` (TypeORM synchronize off)
- [ ] Change bootstrap admin password after first login
- [ ] Cloudflare in front of web + API (TLS; images via R2 public URL / CDN)
- [ ] CI green on `main`
- [ ] Run `powershell -File scripts/smoke-api.ps1` against staging/prod API
- [ ] Manual smoke: register, sell + photos, admin approve, browse, contact, favourite, notifications, forgot password

## Security baseline

- [x] CORS limited to `WEB_URL` origin
- [x] Rate-limit auth + contact (Nest Throttler)
- [x] Helmet on API + security headers on Next.js
- [ ] No secrets in git; rotate any committed demo secrets
- [ ] Backup Postgres schedule

## Soft go-live ops

- [x] Demo seed (~24 active listings) when inventory empty (`SEED_DEMO=false` to disable; prod needs `SEED_DEMO=true`)
- [ ] Scale inventory toward ~100–500 quality listings (real photos on R2)
- [ ] Monitor errors (Sentry or Cloudflare)
- [ ] On-call for moderation queue first 2 weeks

## Demo accounts (local)

- Admin: `admin@throttlelk.lk` / `ChangeMeAdmin1!`
- Demo seller (when seeded): `demo@throttlelk.lk` / `DemoSeller1!`
