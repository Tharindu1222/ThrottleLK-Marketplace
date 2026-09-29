# Account inbox UI polish (Messages + Notifications)

**Date:** 2026-09-29  
**Status:** Approved for planning  
**Context:** Account Notifications is a flat text list; Messages already has stronger hierarchy (avatar, unread cues). User wants both Inbox pages raised to a shared “richer inbox craft” without a split-pane or full account-shell redesign.

## Goal

Give **Notifications** and **Messages** one shared visual language: header with filters, denser rows, clear unread states, polished empty/loading — on-brand motorsport red, no generic AI purple UI.

## Decisions (locked)

- **Scope:** Option 2 — Inbox pair (Notifications + Messages only).
- **Direction:** Approach A — shared inbox chrome + notification type icon tiles; Messages keeps avatars.
- **Filters:** Client-side **All | Unread** chips; URL pagination remains for the full list (All). Unread filter filters the loaded page client-side (no new API required for v1).
- **Out of scope:** API/schema changes, header bell dropdown redesign, GSAP in account, split-pane layout, other account pages (profile/showroom/etc.).

## Current state

| Page | Today |
|------|--------|
| Notifications | White card, title/message/time only; faint unread wash; muted “Mark all read”; no type icons; bare loading/empty |
| Messages | Same card chrome; avatars; stronger unread; still no shared filter header / skeleton |
| Shell | `#f4f5f7` + sidebar; accent `#e10600`; DM Sans display titles |

## Design

### 1. Shared inbox chrome

Extract small presentational helpers (same folder or `components/account-inbox-*`):

- **Page header block** (used by both page.tsx or clients):
  - Display `h1` (existing size)
  - Optional unread count chip (`rounded-full bg-accent text-white` or soft `bg-accent/10 text-accent`)
  - Trailing action slot (Notifications: Mark all read)
- **Filter chips:** All | Unread — pill style matching mobile account nav active chips (white / accent text when active)
- **List card:** keep existing `cardClass` shadow/border
- **Row hover:** `hover:bg-black/[0.02]` (and focus-visible ring for a11y)
- **Skeleton:** 4–5 placeholder rows (circle/tile + two text bars) while loading
- **Empty:** centered icon + `noNotifications` / `noMessages` + one CTA link

Motion: CSS transitions only.

### 2. Notifications rows

- Left **40–48px icon tile** (`rounded-xl bg-surface` or soft accent wash) by type group:

| Group | Types (examples) | Icon mood |
|-------|------------------|-----------|
| Message | `new_message`, `listing_inquiry` | chat |
| Success | `*_approved`, `promo_approved` | check |
| Alert | `*_rejected`, `listing_warning`, `listing_expired` | warning |
| Promo / match | `promo_*`, `saved_search_match`, `price_drop` | tag/spark |
| Default | pending_review / other | bell |

- Unread: `bg-accent/[0.04]` + **red dot** + semibold title + accent-tinted relative time
- Read: neutral time (`text-muted`)
- Keep message snippet + existing CTA labels; whole row still marks read + navigates via `notificationHref`

### 3. Messages rows

- Keep avatar (14–14 → align ~12–14 to denser row if needed)
- Apply same header/filters/skeleton/empty patterns
- Unread: align with notifications (dot or existing unread treatment + accent time)
- Role / listing title / preview hierarchy unchanged in meaning; tighten vertical padding to match notification rows

### 4. i18n

Add only if missing: filter labels `inboxFilterAll`, `inboxFilterUnread`; reuse existing empty/mark-all strings. EN + SI.

### 5. Accessibility

- Filter chips: `role="tablist"`/`tab` **or** toggle buttons with `aria-pressed`
- Rows: keep keyboard focusable; don’t rely on color alone for unread (dot + weight)
- Mark all read: disabled + `aria-disabled` when nothing unread

### 6. Testing / success

- Manual: unread filter hides read items on current page; mark all clears unread chrome; empty + loading look intentional; Messages and Notifications feel like siblings
- No API tests required
- Prefer no visual regression on conversation thread page (`messages/[id]`)

## Success criteria

1. Notifications no longer looks like a plain log — type tiles + unread hierarchy present.
2. Messages shares the same header/filter/skeleton/empty language.
3. Brand stays ThrottleLK red / gray shell; no new color system.
4. Works on mobile sidebar chip layout and desktop sidebar.
