# Admin report actions (Approach A)

Approved: 2026-09-18

## Goal

Standard moderation outcomes for open listing reports — not status-only labels.

## Actions

| UI label | Effect |
|---|---|
| **View listing** | Open public listing page (new tab) |
| **Remove listing** | Reject listing (reason from report) + mark report `actioned` |
| **Warn seller** | In-app + email warning to seller; listing stays live; report `actioned` |
| **Dismiss report** | Mark report `dismissed`; listing unchanged |

## API

- `GET /admin/reports/open` includes listing `{ id, title, slug, coverImageUrl }` (null if missing).
- `POST /admin/reports/:id/resolve` body: `{ action: 'remove_listing' | 'dismiss' | 'warn_seller', note?: string }`.

## Out of scope

Seller suspend/ban, pause-only take-down, bulk resolve, custom note UI (API supports optional `note`).
