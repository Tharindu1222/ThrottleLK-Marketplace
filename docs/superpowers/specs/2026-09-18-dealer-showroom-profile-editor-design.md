# Dealer showroom profile editor (contact, location, map, social)

**Date:** 2026-09-18  
**Status:** Approved (Approach A)  
**Scope:** Expand account Dealer showroom so owners can edit contact, text location, optional map pin, and Facebook/TikTok links — plus owner update API and public display of new fields.

## Goal

Dealers manage showroom details from `/[locale]/account/showroom`: cover (existing), phone/WhatsApp/email/website, district/city/address, optional Leaflet map pin, Facebook & TikTok URLs. Changes appear on the public dealer showroom page.

## Non-goals

- Instagram or other social networks (this pass)
- Opening hours / multi-branch locations
- Streamlit or paid map APIs (Mapbox/Google)
- Changing dealer status/slug ownership rules
- Admin form redesign (admin may keep existing fields; new columns available via shared schema if easy)

## Context

- Dealer already has: `name`, `description`, `phone`, `whatsapp`, `email`, `website`, `address`, `districtId`, `cityId`
- No owner update endpoint today (admin update only)
- No lat/lng or social URL columns
- Cover upload already on showroom page

## Approach A

Single showroom page with sections; new owner `PATCH`; migration for geo + social; Leaflet + OSM for optional pin.

## Data model

Add nullable columns on `dealers`:

| Column | Type | Notes |
|---|---|---|
| `latitude` | `decimal`/`double` nullable | Sri Lanka-ish bounds validated in Zod |
| `longitude` | `decimal`/`double` nullable | Both null or both set |
| `facebook_url` | `varchar` nullable | URL |
| `tiktok_url` | `varchar` nullable | URL |

## API

- **Validation:** `updateDealerProfileSchema` — partial of create fields + lat/lng + facebook/tiktok; phone required when present (min 9); whatsapp/email/website/address optional; districtId+cityId when location changed; lat/lng both null or both numbers in range (~5–10 lat, ~79–82 lng for LK soft check, or wider world bounds if preferred — use world bounds with soft LK default map center)
- **Endpoint:** `PATCH /api/v1/dealers/mine` (JWT) — updates the owner’s **active** dealer; 404/400 if none
- **GET mine / public by slug:** include new fields in response
- Clear pin: send `latitude: null, longitude: null`

## Web — showroom page sections

1. **Cover** — unchanged manager  
2. **Shop info** — name, description (recommended)  
3. **Contact** — phone, WhatsApp, email, website  
4. **Location** — district → cities, address; Leaflet map (click/drag marker); Clear pin  
5. **Social** — Facebook URL, TikTok URL  
6. Single **Save details** for form sections (cover stays separate)

Empty / login / no-active-dealer states unchanged.

## Public showroom

- Show phone/WhatsApp as today when present  
- Show address / district / city  
- If lat/lng set: embed read-only map (or link to OSM)  
- If facebook/tiktok set: icon/text links

## Map tech

- `leaflet` (+ types) in web app  
- OpenStreetMap tiles  
- Default view: Sri Lanka center when no pin  
- No API key

## i18n

en + si labels for new sections, fields, save, clear pin, social, validation hints.

## Files (expected)

- Migration + `dealer.entity.ts`
- `packages/validation` schema + types
- `dealers.service` / `dealers.controller` owner PATCH
- `account/showroom/*` form sections + map component
- Public `dealers/[slug]/page.tsx` display
- `i18n.ts`

## Out of scope follow-ups

- Instagram, YouTube, opening hours  
- Geocoding address → pin automatically  
- Sharing Leaflet component with listing locations
