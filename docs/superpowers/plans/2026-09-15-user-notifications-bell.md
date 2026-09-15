# User Notifications Bell Implementation Plan

> **For agentic workers:** Implement Approach A from `docs/superpowers/specs/2026-09-15-user-notifications-bell-design.md`.

**Goal:** Header bell + polished notifications page on existing APIs.

## Task 1: Shared helpers + NotificationsBell
Create `apps/web/src/components/notifications-bell.tsx` — fetch list/count, poll, dropdown UI, mark read, navigate.

## Task 2: Wire site-header
Add bell for logged-in desktop + mobile.

## Task 3: Polish notifications page
Update page + client to card UI and deep links.

## Task 4: i18n keys
Add EN/SI strings for bell/page copy.
