# Promote package cards UI

**Goal:** Replace the stacked promote package list with pricing-style cards (reference: horizontal plan cards + “Most Popular”), adapted to ThrottleLK.

## Layout
- Widen promote form content for the package step (`max-w-5xl` or similar); keep pay/slip sections readable.
- Desktop: 3 equal columns. Mobile: vertical stack.
- **Featured** is “Most Popular”: slightly taller/emphasized, accent (ThrottleLK red) fill or strong border, inverted CTA; pill badge on top.

## Card content (per package)
1. Tier title (Boost / Featured / Premium)
2. Small abstract visual (CSS/SVG — bike/visibility metaphor; no travel clipart, no stock photos)
3. Large LKR price + duration line
4. Optional meta strip: duration days, priority/surfaces count (no fake hotel ratings)
5. Feature list: all sales surfaces in fixed order `home → browse → detail`; included = check + strong text; excluded = muted/strikethrough style
6. Select CTA — selecting sets `selectedId` (same as today)

## Brand
- Use existing tokens (`accent`, `foreground`, `muted`, borders). Avoid purple/indigo gradients and generic AI pricing aesthetics.
- Selected state: Featured popular card stays prominent; other selected cards use accent ring.

## Scope
- `promote-listing-form.tsx` (+ optional small `promo-package-card.tsx`)
- i18n: `promoMostPopular`, select CTA if missing
- No API changes
