# PRD-48 — Fix: nav double "current" + inputs overflowing cards

## Goal
Owner bugs 2026-09-29: (1) after a full load, the first client
navigation left two nav links selected; (2) on mobile the "When?" date
input (claim accept) overflowed its card.

## Dev notes
- Root cause (1): Solid skips attribute writes while it still thinks
  the page is hydrating (`sharedConfig.done` only flips on the first
  delegated event), so `<A>`'s `aria-current` wasn't removed on the
  first navigation. Fix: `SiteNav` writes `aria-current` + active
  classes itself in an effect on `location.pathname`
  (`isCurrent(pathname, resolvedHref, end)`).
- Root cause (2): iOS/Chromium give `input[type=date]` an intrinsic
  min-width; grid `1fr` columns didn't shrink. Fix: `max-inline-size:
  100%; min-inline-size: 0` on controls, `appearance: none` +
  start-aligned date value, and `minmax(0, 1fr)` in all card grids.
- Verified against a local production build at 360px: nav transitions
  from /app and from /, and there's no control overflow in the composer
  (date open), coupon form, accept form, decline form, or settings.
