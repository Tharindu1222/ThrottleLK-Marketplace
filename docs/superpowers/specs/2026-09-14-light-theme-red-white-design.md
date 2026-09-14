# Light theme — red / white / gray / black

**Date:** 2026-09-14  
**Status:** Approved  
**Approach:** Token flip + fix dark-only classes (marketplace + admin)

## Goals

- Permanent light theme for the full site (marketplace and admin).
- Palette limited to red, white, gray, and black.
- Red used as accent only (buttons, links, focus, highlights) — not full red chrome.
- No theme toggle / dark mode.

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | Marketplace + admin |
| Red intensity | Accent only; keep `#e10600` |
| Mode | Permanent light (no dark option) |
| Approach | Update CSS tokens, then fix hardcoded dark assumptions |

## Color tokens

### Marketplace (`:root` in `apps/web/src/app/globals.css`)

| Token | Value | Role |
|-------|-------|------|
| `--background` | `#ffffff` | Page background |
| `--foreground` | `#0a0a0a` | Primary text |
| `--muted` | `#6b6b6b` | Secondary text |
| `--accent` | `#e10600` | Buttons, links, focus rings |
| `--surface` | `#f5f5f5` | Cards / panels |
| `--surface-2` | `#ebebeb` | Nested / hover surfaces |
| `--border` | `rgba(0, 0, 0, 0.12)` | Dividers / outlines |
| `--gray-bar` | medium gray (e.g. `#4a4a4a`) | Hero speed bars |
| `--gray-bar-light` | lighter gray (e.g. `#8a8a8a`) | Hero speed bars |

### Admin (`.admin-app`)

Align with the same light red / white / gray / black system:

- Background: white / off-white
- Surfaces: light gray
- Text: near-black; muted: medium gray
- Borders: black at low opacity
- Accent: `#e10600` (replace purple `#7c5cfc` / related purple tokens)
- Keep distinct status colors for danger / success / warning / info (functional, not brand)

## Component work

After tokens flip, fix classes that assume dark UI:

1. **Borders / rings** — replace `border-white/10`, `ring-white/10`, and similar with token borders or black/gray opacity so edges remain visible on white.
2. **Surfaces** — keep `bg-surface` / token-based panels; they become light gray via tokens.
3. **Text** — reserve `text-white` for red buttons and intentional dark blocks (e.g. hero dark side); body/headings use `text-foreground`.
4. **Forms** — light inputs, dark text, gray borders; primary buttons remain red with white label text.
5. **Hero** — keep diagonal black/white split and red/gray speed bars; white headline on the dark side; ensure search controls have correct contrast.
6. **Admin** — restyle to light surfaces and red accent; drop purple brand skin.

## Out of scope

- Light/dark toggle or saved preference
- Page layout redesign or new components
- Font / copy / imagery changes
- Backend / API changes

## Acceptance criteria

- Public pages read as light (white/gray) with black text and red accents.
- Borders and form fields are visible on light backgrounds.
- Admin uses the same light palette with red accent (not purple).
- Hero still works with its black/white diagonal split.
- No remaining unreadable white-on-white or invisible white borders on key flows (home, browse, listing detail, sell, account, admin overview).

## Primary files

- `apps/web/src/app/globals.css` — token source of truth
- Marketplace components using `border-white/*`, `ring-white/*`, `text-white`, hardcoded dark colors
- Admin CSS under `.admin-app` and admin components using `--admin-*` purple accents
