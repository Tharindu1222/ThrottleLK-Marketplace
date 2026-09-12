# Admin notifications bell

**Date:** 2026-09-12  
**Status:** Approved

## Goal

Wire the decorative admin topbar bell so the logged-in admin can see their in-app notifications and unread count.

## Approach

Bell dropdown in `AdminTopbar` using existing APIs:

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/read-all`

## UI

- Unread badge on bell
- Dropdown: list, mark one/all read, empty state
- Admin design tokens

## Out of scope

New admin-specific event types (pending listing/dealer alerts).
