# Contact + Filters + Admin — Design

**Date:** 2026-09-11  
**Approach:** Extend current Nest/Next stack (no Redis/WebSockets).

## Decisions

1. **Contact:** Seller details (name, profile) + Call/WhatsApp after login **and** in-platform message threads with replies.
2. **Guests:** Name + profile only; login required for phone/WhatsApp and chat.
3. **Browse:** MVP filters (model, category, year min/max, condition) + full sorts (newest, oldest, price↑↓, mileage↑↓, year newest/oldest).
4. **Admin reports:** Status-only — Resolve → `actioned`, Dismiss → `dismissed` (no auto listing change).
5. **Admin dealers:** Reject pending applications (`rejected` + notify owner).

## Messaging

- Tables: `conversations`, `conversation_messages`
- Unique (listingId, buyerUserId)
- Notify other party in-app + email on new thread/message
- UI: `/account/messages`, `/account/messages/[id]`, poll ~15s
- Remove guest inquiry form from contact panel

## Out of scope

Realtime WebSockets, guest chat, auto-reject listing on report resolve.
