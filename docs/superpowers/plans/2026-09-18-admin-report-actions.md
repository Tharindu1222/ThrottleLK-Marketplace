# Admin report actions — implementation plan

> **For agentic workers:** IMPLEMENT NOW. Steps below.

**Goal:** Approach A — View listing + Remove listing (reject) + Dismiss report.

**Spec:** `docs/superpowers/specs/2026-09-18-admin-report-actions-design.md`

## Tasks

1. Validation: `adminResolveReportSchema` → `{ action: 'remove_listing' | 'dismiss' }`
2. `ReportsService.listOpen` join listing cover/title/slug; `resolve(id, action)` dismiss or reject+actioned
3. Wire admin controller to new schema
4. Update `AdminReport` type + `admin-reports.tsx` UI
5. Manual check: dismiss keeps listing; remove rejects + clears queue badge
