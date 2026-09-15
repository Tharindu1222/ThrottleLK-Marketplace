# User notifications bell + page polish (Approach A)

**Date:** 2026-09-15  
**Status:** Approved  
**Scope:** Marketplace user in-app notifications UI on existing APIs/events

## Goal

Logged-in buyers/sellers get a header notification bell with unread badge and dropdown, plus a polished `/account/notifications` page — using existing Nest notification APIs and event types.

## Existing backend (unchanged)

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/read-all`
- Events already emitted: listing approved/rejected, dealer approved/rejected, new message, price drop (+ email)

## Header bell

- Visible only when logged in (site header, near Account)
- Bell icon + unread count badge
- Dropdown: up to ~8 latest items; unread styling
- Mark one read on open/click; Mark all read; link “View all” → `/{locale}/account/notifications`
- Empty state copy
- Poll unread + list every ~30s while mounted
- Click navigation:
  - `new_message` → `/account/messages/{conversationId}`
  - listing / price_drop → `/bikes/{slug}`
  - dealer_* → `/dealers/{slug}` when slug present, else `/dealers/apply`

## Notifications page

- Polish `/account/notifications` to match profile card language (white card, soft shadow, muted links, accent sparingly)
- Full list, mark all read, empty + login states
- Same deep-link behaviour as dropdown

## Out of scope

- New notification event types
- Per-type preference toggles
- WebSockets / push / SMS

## Files likely touched

- `apps/web/src/components/notifications-bell.tsx` (new)
- `apps/web/src/components/site-header.tsx`
- `apps/web/src/app/[locale]/account/notifications/*`
- `apps/web/src/lib/i18n.ts`

## Success criteria

- Logged-in user sees badge when unread > 0
- Dropdown and page mark read correctly
- Notification click lands on the right destination
- Guest header shows no bell
