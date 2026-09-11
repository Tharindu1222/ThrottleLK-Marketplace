# Phase 8c complete — Password reset + email verification

**Date:** 2026-09-11

## Shipped

- `auth_tokens` table (hashed one-time tokens)
- `POST /auth/forgot-password` (no email enumeration)
- `POST /auth/reset-password`
- `POST /auth/verify-email`
- `POST /auth/resend-verification` (auth required)
- Register sends verification email (Resend or console log)
- Web: `/forgot-password`, `/reset-password?token=`, `/verify-email?token=`
- Login “Forgot password?” + Profile resend verification

## Notes

- Email links use `WEB_URL` (default `http://localhost:3000`)
- With `RESEND_API_KEY` set, real emails go out; otherwise check API logs
