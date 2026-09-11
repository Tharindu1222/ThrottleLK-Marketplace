# Phase 6b complete — Listing image uploads

**Date:** 2026-09-11

## Shipped

- `listing_images` entity + local multipart upload (JPEG/PNG/WebP, 5MB)
- Endpoints: `GET/POST /listings/:id/images`, `PATCH .../cover`, `DELETE .../:imageId`
- Static serve at `/uploads/` (dev stand-in for Cloudflare R2)
- Listings payloads include `images` + `coverImageUrl`
- Web: `ListingImageManager` on My listings + post-create Sell flow
- Browse cards + detail page show cover (and thumbnails when multiple)

## Verified

- Multipart upload returns cover image URL
- Static file served at `/uploads/...`
- Owned listing + public approved listing include `coverImageUrl`

## Remaining toward big-bang launch

- Cloudflare R2 signed uploads (replace local disk)
- Image optimization / real thumbnails
- Email (Resend) + price-drop / notification workers
- Production CI/CD, hardening, load test
