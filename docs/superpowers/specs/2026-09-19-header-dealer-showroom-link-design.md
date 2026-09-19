# Header account menu — Dealer showroom link

**Date:** 2026-09-19  
**Status:** Approved for implementation planning

## Goal

When a logged-in user has the `dealer` role, show a **Dealer showroom** item in the site header account menus (desktop dropdown and mobile account list), linking to the existing manage page at `/{locale}/account/showroom`.

Non-dealer users must not see the item.

## Context

- Account sidebar (`account-sidebar.tsx`) already shows a dealer-only nav item:
  - Label: `t(locale, 'dealerShowroom')` → “Dealer showroom”
  - Href: `/{locale}/account/showroom`
  - Gate: `user?.roles?.includes('dealer')`
- Header account menus in `site-header.tsx` list profile, listings, messages, notifications, favourites (and compare on mobile) but omit the showroom link.

## Decisions

| Decision | Choice |
|----------|--------|
| Destination | Manage page `/account/showroom` (same as sidebar), not public `/dealers/{slug}` |
| Label | Existing i18n key `dealerShowroom` (EN + SI already present) |
| Visibility | `dealer` role only; same check as sidebar |
| Placement | Immediately after **Account details**, matching sidebar order |
| Scope | Header menus only — no i18n, sidebar, or showroom page changes |

## Approach

**Mirror account sidebar in `site-header.tsx`** (chosen over extracting a shared nav config). Small, local change; avoids an unnecessary refactor for one missing link.

## Behaviour

1. Header already loads `/api/v1/users/me` and stores `roles` on the client user.
2. Compute `isDealer = Boolean(user?.roles?.includes('dealer'))`.
3. If `isDealer`, render a menu link after Account details:
   - Desktop dropdown (`role="menuitem"`): same styling as sibling links
   - Mobile slide-out account list: same styling as sibling links
4. Click closes the open menu (same `onClick` pattern as other items).
5. If not dealer (or logged out), omit the link entirely.

## Out of scope

- Renaming copy to “Dealer shop”
- Linking to the public dealer showroom
- Shared nav config extraction between header and sidebar
- Changes to showroom page, API, or role assignment

## Verification

- Log in as a dealer → desktop dropdown and mobile menu show **Dealer showroom** after Account details → navigates to `/{locale}/account/showroom`.
- Log in as a non-dealer → item absent in both menus.
