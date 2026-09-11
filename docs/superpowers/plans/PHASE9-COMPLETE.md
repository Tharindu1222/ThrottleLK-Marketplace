# Phase 9 — Contact threads, browse filters, admin resolve

## Shipped

### Contact + messaging
- Contact panel: seller name/profile always; Call/WhatsApp after login; chat form for logged-in buyers
- Guests: no phone, no composer — login CTAs
- `conversations` + `conversation_messages` entities
- API: `GET/POST /conversations`, `GET /conversations/:id`, `POST /conversations/:id/messages`
- Inbox UI: `/account/messages`, thread with 15s poll
- In-app + email notify on new message

### Browse filters + sort
- Filters: brand, model (cascading), category, district, condition, min/max price, min/max year
- Sorts: newest, oldest, price↑↓, mileage↑↓, year newest/oldest
- Saved-search query schema extended

### Admin
- `POST /admin/reports/:id/resolve` with `{ status: actioned | dismissed }`
- `POST /admin/dealers/:id/reject` with reason + owner notify
- Admin UI buttons for both

## Design
`docs/superpowers/specs/2026-09-11-contact-filters-admin-design.md`
