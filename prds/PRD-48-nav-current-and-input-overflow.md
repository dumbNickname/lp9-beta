# PRD-48 — Fix: nav double "current" + inputs overflowing cards

> Status: see `PROGRESS.md`.

## Goal
Owner bugs 2026-09-29: (1) after a full load, the first client
navigation left two nav links selected; (2) on mobile the "When?" date
input (claim accept) overflowed its card.

## What shipped
- Site nav sets its current-page marker and active styling itself,
  reacting to the current path, instead of relying on the router link.
- Form controls never exceed their card: controls may shrink to zero
  and cap at full width, date inputs drop native appearance and
  start-align their value, and card grids use shrinkable columns.

## Verification
- Regression unit test for the nav current marker.
- Local production build at 360px: nav transitions from /app and from
  /, and no control overflow in composer (date open), coupon form,
  accept/decline forms, or settings.

## Gotchas
- Solid skips attribute writes while it still thinks the page is
  hydrating (only flips on the first delegated event), so SSR'd
  reactive attributes can go stale; write them in an effect.
- iOS/Chromium give date inputs an intrinsic min-width; plain `1fr`
  grid columns won't shrink below it (use `minmax(0, 1fr)`).

## Later changes
- The site header is hidden inside `/app` since PRD-49; the nav fix
  applies to the static pages.
