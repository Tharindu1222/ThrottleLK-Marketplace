# Account Inbox UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shared richer inbox chrome for Notifications + Messages (filters, skeletons, type tiles, unread hierarchy).

**Architecture:** Presentational shared components under `apps/web/src/components/`; wire into both clients; no API changes.

**Tech Stack:** Next.js 15, React 19, Tailwind, existing i18n.

**Spec:** `docs/superpowers/specs/2026-09-29-account-inbox-ui-design.md`

## Global Constraints

- Accent `#e10600` only; account gray shell
- Client All|Unread filter; no new API
- CSS transitions only; no GSAP
- Don’t change `messages/[id]` thread page

---

### Task 1: Shared inbox components + i18n

**Files:**
- Create: `apps/web/src/components/account-inbox-chrome.tsx` (header, filters, skeleton, empty)
- Create: `apps/web/src/components/notification-type-icon.tsx` (type → tile)
- Modify: `apps/web/src/lib/i18n.ts` (`inboxFilterAll`, `inboxFilterUnread` EN+SI)

### Task 2: Notifications client redesign

**Files:**
- Modify: `apps/web/src/app/[locale]/account/notifications/notifications-client.tsx`
- Modify: `apps/web/src/app/[locale]/account/notifications/page.tsx` if header moves into client

### Task 3: Messages inbox align

**Files:**
- Modify: `apps/web/src/app/[locale]/account/messages/messages-inbox.tsx`
- Modify: `apps/web/src/app/[locale]/account/messages/page.tsx` if needed

### Task 4: Verify

- [ ] Lint clean on touched files
- [ ] Manual smoke both pages
