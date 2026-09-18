# Dealer showroom account tab (cover image)

**Date:** 2026-09-18  
**Status:** Approved (Approach A)  
**Scope:** Account area — dealers manage a single showroom cover photo

## Goal

Give approved dealers an account sidebar tab **Dealer showroom** where they can upload, replace, or remove their shop cover image (the photo shown on public dealer pages and dealer cards).

## Non-goals

- Raising `MAX_DEALER_IMAGES` above 1 / multi-photo gallery
- Editing dealer name, phone, address, or other profile fields on this page
- Admin UI changes (admin already has shop photo manager)
- Backend API changes (owner upload/delete already exist)

## Context

- Dealer images: `DealerImage` rows; `coverImageUrl` is derived from first image by `sortOrder`
- Cap: `MAX_DEALER_IMAGES = 1` (5MB, JPEG/PNG/WebP)
- Owner API: `GET/POST /api/v1/dealers/id/:id/images`, `DELETE .../images/:imageId`
- Account sidebar today has no dealer-only nav item

## Approach A

New route + dealer-gated sidebar item; thin client manager calling owner APIs.

## Behaviour

### Nav visibility

- Show **Dealer showroom** in account sidebar only when stored user `roles` includes `dealer`
- Hide for buyers / private sellers / pending applicants without dealer role

### Page `/{locale}/account/showroom`

1. Auth required (same as other account pages)
2. Load `GET /api/v1/dealers/mine`
3. Prefer status `active` dealer; if none:
   - Empty state explaining no active showroom + link toward apply / dealers as appropriate
4. If active dealer:
   - Fixed-aspect preview box; image uses `object-contain` (no crop); empty placeholder when no photo
   - Upload when empty; Replace = delete current then upload; Remove when photo exists
   - Link **View showroom** → `/{locale}/dealers/{slug}`
5. Errors surfaced inline (max size, type, max images, network)

### Visual

- Match account page card language (white cards, light borders, accent CTAs)
- Preview container size fixed; full image visible inside (`object-contain`)

## i18n

New en + si keys: nav label, page title, hint, upload/replace/remove, empty/no-dealer states (reuse `viewShowroom` where possible).

## Files

- Modify: `apps/web/src/components/account-sidebar.tsx`
- Create: `apps/web/src/app/[locale]/account/showroom/page.tsx` (+ client component as needed)
- Modify: `apps/web/src/lib/i18n.ts`
- Optional: `apps/web/src/components/dealer-showroom-cover-manager.tsx` (owner API; mirror admin manager patterns)

## Out of scope follow-ups

- Pending dealers uploading cover before approval
- Shared refactor of admin + owner image managers into one package
