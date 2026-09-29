# Showroom Cover Crop & Framing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let bike + parts dealers crop covers on upload, adjust framing afterward, and preview covers the same way the public showroom does (`object-cover` + `50dvh` + focal point).

**Architecture:** Client-side crop (`react-easy-crop`) before `apiUpload`; store `coverFocusX`/`coverFocusY` (0–100) on `dealers` and `parts_dealers`; shared `ShowroomCoverEditor` + crop dialog; public `DealerShowroomProfile` applies `object-position`.

**Tech Stack:** NestJS/TypeORM, Zod validation package, Next.js 15, React 19, `react-easy-crop`, canvas blob export.

**Spec:** `docs/superpowers/specs/2026-09-29-showroom-cover-crop-design.md`

## Global Constraints

- Both bike and parts showrooms
- Public hero stays `h-[50dvh] min-h-48` (screen-adaptive)
- Crop dialog working aspect **2:1**; live desktop + phone mini-previews
- Upload still ≤5MB jpeg/png/webp; max 1 image
- No server-side crop API; no raw original retention
- Reset focus to 50/50 on cover remove

---

### Task 1: API focus fields

**Files:**
- Create: `apps/api/src/migrations/1727600000000-AddDealerCoverFocus.ts`
- Modify: `apps/api/src/dealers/dealer.entity.ts`
- Modify: `apps/api/src/parts-dealers/parts-dealer.entity.ts`
- Modify: `packages/validation/src/index.ts` (`updateDealerProfileSchema`)
- Modify: `apps/api/src/dealers/dealers.service.ts` (`applyProfileFields`)
- Modify: `apps/api/src/parts-dealers/parts-dealers.service.ts` (same)
- Modify: image remove paths to reset focus on dealer/parts-dealer

- [ ] Add `coverFocusX` / `coverFocusY` double columns default 50
- [ ] Migration adds columns to both tables
- [ ] Zod: `z.number().min(0).max(100).optional()` for both fields
- [ ] Apply in profile update; reset to 50 on image remove

### Task 2: Crop helpers + dialog + cover editor (web)

**Files:**
- Create: `apps/web/src/lib/cover-crop.ts` (+ optional spec)
- Create: `apps/web/src/components/cover-image-crop-dialog.tsx`
- Create: `apps/web/src/components/showroom-cover-editor.tsx`
- Modify: `apps/web/package.json` (add `react-easy-crop`)
- Modify: `apps/web/src/lib/i18n.ts`
- Modify: `apps/web/src/lib/dealer-showroom.ts` (`coverFocusPosition` helper)

- [ ] Install `react-easy-crop`
- [ ] `getCroppedCoverBlob`, `clampCoverFocus`, `coverObjectPosition`
- [ ] Crop dialog with 2:1 cropper + desktop/phone previews
- [ ] Editor: public-matching preview, replace/remove, adjust framing ranges, save focus via PATCH

### Task 3: Wire account pages + public profile

**Files:**
- Modify: `apps/web/src/app/[locale]/account/showroom/showroom-client.tsx`
- Modify: `apps/web/src/app/[locale]/account/parts-showroom/parts-showroom-client.tsx`
- Modify: `apps/web/src/components/dealer-showroom-profile.tsx`

- [ ] Replace inline cover section with `ShowroomCoverEditor`
- [ ] Include focus fields on `DealerShop` type / applyDealer
- [ ] Public img uses `objectPosition` from dealer focus (default 50/50)
- [ ] Prefer upload-then-delete-old when replacing cover

### Task 4: Verify

- [ ] `npm test` in apps/web for dealer-showroom / cover helpers
- [ ] API builds / tsc
- [ ] Manual smoke: crop upload + framing save
