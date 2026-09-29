# Dealer showroom cover crop & framing

**Date:** 2026-09-29  
**Status:** Approved for planning  
**Context:** Account showroom cover preview uses `object-contain` while the public dealer/parts showroom uses `object-cover` at `h-[50dvh]`. Dealers cannot crop or reframe covers before or after upload. No client crop library or focal-point fields exist today.

## Goal

Let bike dealers and parts shops crop a cover on upload, adjust framing afterward, and see a management preview that matches how the cover looks on the public showroom across viewport sizes.

## Decisions (locked)

- **Scope:** Both `/account/showroom` and `/account/parts-showroom`.
- **Approach:** A — bake crop on upload **and** persist focal point for later framing tweaks.
- **Public hero height:** Keep responsive `h-[50dvh] min-h-48` (screen-adaptive; no fixed public aspect ratio).
- **Out of scope:** Listing photo crop, admin cover editors, avatar/logo crop, changing R2/WebP pipeline beyond accepting the already-cropped upload, directory card cover framing.

## Current state

| Surface | Behavior today |
|---------|----------------|
| Account showroom cover preview | `min-h-[14–18rem]`, `object-contain` |
| Public `DealerShowroomProfile` | `h-[50dvh] min-h-48`, `object-cover object-center` |
| Upload | File → DELETE old → POST multipart `file` (≤5MB jpeg/png/webp); max 1 image |
| Entities | `dealer_images` / `parts_dealer_images`; no focal fields on dealer rows |
| Crop libraries | None |

## Design

### 1. Shared cover editor (web)

New shared module used by both showroom clients:

- `apps/web/src/components/showroom-cover-editor.tsx` — preview shell, Replace/Remove, Adjust framing, wires file → crop dialog → upload.
- `apps/web/src/components/cover-image-crop-dialog.tsx` — modal with `react-easy-crop`, zoom slider, Cancel / Use photo.
- Small helper `getCroppedCoverBlob(imageSrc, croppedAreaPixels)` → canvas → JPEG/WebP blob for `apiUpload`.

**Crop dialog behavior**

- Opens when the user picks a file (Replace or Upload).
- Cropper uses a **wide working aspect (2:1)** so dealers trim obvious top/bottom/side waste before upload. This is an upload framing aid, not a promise that every viewport shows that exact crop (public remains `50dvh`).
- Live mini-previews beside/below the cropper:
  - **Desktop** strip: wide frame simulating ~`50dvh` on a landscape viewport (`object-cover` + current drag position).
  - **Phone** strip: taller frame simulating ~`50dvh` on a narrow viewport.
- Confirm exports the cropped pixels to a blob (cap long edge ~1600px client-side if needed so upload stays ≤5MB), then existing upload flow runs.
- Cancel discards the pending file; no upload.

**Adjust framing (after save)**

- On an existing cover, “Adjust framing” enables drag (or X/Y range inputs) over a public-sized preview (`h-[50dvh]` / constrained demo height on small admin layouts).
- Updates `coverFocusX` / `coverFocusY` (0–100, default 50/50) via PATCH; debounced or explicit Save.
- Does not re-upload the image.

### 2. Management preview matches public

Replace the account cover banner image classes:

- Container: same public geometry intent — `relative isolate h-[50dvh] min-h-48 overflow-hidden bg-zinc-200` (on very short layouts, allow a slightly shorter demo height only if the page becomes unusable; prefer matching public).
- Image: `absolute inset-0 h-full w-full object-cover` with  
  `style={{ objectPosition: \`${coverFocusX}% ${coverFocusY}%\` }}`.
- Keep existing overlay chrome (label, Replace, Remove) for owner UX; public page stays overlay-free.

### 3. Public showroom

`DealerShowroomProfile` reads `coverFocusX` / `coverFocusY` from the dealer payload (defaults 50/50 when null/missing for old rows) and applies the same `object-position`. Height stays `h-[50dvh] min-h-48`.

Bike and parts public pages already share this component — one change covers both.

### 4. API / data model

Add nullable numeric columns (or float) on both shop entities:

| Entity | Fields | Defaults |
|--------|--------|----------|
| `Dealer` | `coverFocusX`, `coverFocusY` | `50`, `50` |
| `PartsDealer` | `coverFocusX`, `coverFocusY` | `50`, `50` |

- Migration for both tables.
- Include fields in public + owner GET serializers (`withCover` / equivalent).
- Owner PATCH (existing dealer / parts-dealer update endpoints, or a small dedicated PATCH if update DTOs are closed): validate 0–100 inclusive.
- Image upload endpoints unchanged: they still store one WebP display image; crop happens client-side before POST.
- On cover **Remove**, reset focus to 50/50 (or leave stale — prefer reset so next upload starts centered).

### 5. i18n

Add keys (en + existing locale pattern in `i18n.ts`): crop title, zoom, use photo, cancel, adjust framing, framing hint, desktop/phone preview labels. Reuse existing `replaceCover` / `removeCover` / `photoHint` where possible.

### 6. Accessibility & errors

- Crop dialog: focus trap, Esc closes, labelled controls for zoom and confirm.
- Framing adjust: keyboard-accessible X/Y controls (range inputs), not drag-only.
- Upload/crop failures surface existing showroom error toast/banner patterns; do not leave orphan deleted covers if POST fails after DELETE — prefer upload-first-then-delete-old **or** restore previous on failure (match safest existing showroom behavior; if current code deletes first, document and improve to upload-then-swap in the same change if low-risk).

### 7. Testing

- Unit: focus clamp 0–100; default position when fields missing.
- Manual: upload → crop → public `/dealers/[slug]` and `/parts-dealers/[slug]` match account preview at same viewport width; adjust framing updates public without re-upload; remove clears cover and resets focus.

## Non-goals / explicit non-requirements

- Server-side crop API.
- Storing raw uncropped original alongside display image.
- Per-breakpoint stored focus pairs (one global X/Y only).
- Changing directory listing card aspect (`16/10`).

## Success criteria

1. Account cover preview uses `object-cover` + focus and visually matches public at the same viewport width.
2. Dealers can crop on upload (bike + parts).
3. Dealers can change framing later without re-uploading.
4. Public hero remains screen-adaptive (`50dvh`).
