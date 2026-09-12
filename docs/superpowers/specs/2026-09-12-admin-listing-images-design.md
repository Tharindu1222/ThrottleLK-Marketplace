# Admin listing images (edit modal)

**Date:** 2026-09-12  
**Status:** Approved approach (mirror dealers)

## Problem

On `/en/admin/listings`, Edit listing shows fields but not photos. Admins cannot view, add, or remove listing images.

## Solution

Mirror admin dealer shop photos:

1. Admin API for listing images (list / upload / delete).
2. `AdminListingImageManager` in the Edit listing modal when a listing id exists.
3. Max 5 photos; JPEG/PNG/WebP; 5MB each; first photo is cover.

## Backend

- `GET/POST /api/v1/admin/listings/:id/images`
- `DELETE /api/v1/admin/listings/:id/images/:imageId`
- `ListingImagesService.uploadAsAdmin` / `removeAsAdmin` (no seller ownership check)
- Export `ListingImagesService` from `ListingsModule`

## Frontend

- New `admin-listing-image-manager.tsx` (dealer image manager pattern, admin listing URLs)
- Wire into `admin-listings.tsx` edit modal: show when `editingId` set; else hint to save first

## Out of scope

Reorder UI, dedicated detail page, seller flow changes.
