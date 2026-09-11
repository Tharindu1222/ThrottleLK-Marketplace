# Phase 2 complete — Public web

**Date:** 2026-09-11

## Shipped

- Browse `/en/bikes` with brand / district / price / q filters
- Listing detail `/en/bikes/[slug]` with hybrid contact
  - Guests: contact form only (phone redacted by API)
  - Logged-in: phone + WhatsApp after client re-fetch with JWT
- Auth: `/en/login`, `/en/register`
- Sell: `/en/sell` create + auto-submit for review
- My listings: `/en/account/listings`
- API: `GET /listings/mine`, `POST /listings/:id/contact`, optional JWT on detail

## Verified

- Guest detail hides phone (`contactHidden: true`)
- Contact inquiry creates `listing_inquiries` row
- Web pages build and respond 200

## Next

Phase 3 SEO (brand/model/location pages, metadata, sitemap) and/or admin moderation UI.
