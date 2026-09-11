# Phase 8d complete — Logout, rate limits, security headers

**Date:** 2026-09-11

## Shipped

- `refresh_sessions` table — refresh tokens tracked + rotatable
- `POST /auth/logout` revokes refresh session
- Header logout calls API then clears local session
- Global rate limit (120/min) + tighter auth/contact limits
- Helmet on API; health endpoint skips throttle
- `AuthUser.emailVerifiedAt`
- Sitemap: dealers + seller profile URLs

## Note

Users who were logged in before this deploy should log in again (old refresh tokens are not in `refresh_sessions`).
