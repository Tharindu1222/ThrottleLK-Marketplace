# Dealer map — design

**Date:** 2026-09-19  
**Status:** Approved for implementation

## Goal

Public full-screen map of approved dealers with saved coordinates, at `/{locale}/dealers/map`.

## UX

- Separate route (not a list/map toggle on the same URL).
- Entry points: **Map view** on dealers list + **Dealer map** link in header (desktop + mobile).
- Full-bleed map under site header/breadcrumbs; footer and compare tray hidden on this route.
- Compact toolbar: title + **List view** back to `/dealers`.
- Pin click → Leaflet popup (name, city/district, **View showroom** → dealer slug page).
- Empty state when no dealers have lat/lng.

## API

`GET /api/v1/dealers/map` (public, registered before `:slug`)

Returns active dealers with non-null coordinates (excludes `0,0`), slim DTO:

- `id`, `name`, `slug`, `latitude`, `longitude`, `coverImageUrl`
- `city` / `district` `{ name }` or null

No pagination for MVP.

## Frontend

- Reuse Leaflet + OSM tiles (same stack as `DealerMapPicker`).
- New multi-marker client component + dynamic SSR-off embed.
- `fitBounds` when multiple pins; sensible zoom for one pin.

## i18n

`dealersMap`, `dealersMapView`, `dealersListView`, `dealersMapEmpty` (en + si). Reuse `viewShowroom` in popups.

## Out of scope

Search on map, clustering, directions, geocoding addresses without pins, side panel.
