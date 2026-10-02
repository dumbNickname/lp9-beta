# PRD-39 — App tabs (Notes / Coupons) shell

> Status: see `PROGRESS.md`.
> Later changes: superseded by the three worlds of PRD-49.

## Goal

Split the paired app into Notes and Coupons tabs with a shared header
(pair badge, privacy toggle, balance on both). Prerequisite for PRD-36.

## What shipped

- Tab state in the URL hash: `#coupons`; Notes clears the hash. Written
  with `replaceState`, follows `hashchange`. No new prerender routes.
- `#pair=` deep link keeps working (pair handling runs before tabs).
- Accessible tabs pattern: `aria-selected`, arrow keys switch.
- Rendered as a pill segmented control under the balance instead of the
  planned bottom bar (simpler, reads well on mobile).
- Coupons refresh on focus while on the Coupons tab.

## Decisions

- **D-39.1** Tabs via `location.hash`, not sub-routes. Why: GH Pages
  only prerenders `/app`; sub-routes would rely on the 404.html
  fallback (served with HTTP 404). A hash keeps one clean 200 page and
  back-button support. Alternative: `/app/coupons` route + prerender.

## Verification

- Unit tests for tab switching and hash sync.

## Later changes

- Tabs replaced by three worlds Give / My wishes / For partner (PRD-49).
- Site header hidden inside `/app` since PRD-49; the app has its own app
  bar (mobile: two rows, pair name + eye + more, then a full-width heart
  wallet strip; desktop: one row).
- Settings (PRD-51, `#settings`) and a "How it works" guide (`#guide`)
  also use hash pages.
