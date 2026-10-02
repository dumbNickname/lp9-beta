# PRD-43 — Multiple relationships: switcher + `?rel=`

> Status: see `PROGRESS.md`.

## Goal

One account can hold several pairs (the §4 data model already allows
it). The owner wants a test pair alongside a real partner. Switch from
the pair badge; the choice is remembered per device, and `?rel=<id>`
selects one (bookmarkable).

## What shipped

- All active relationships are loaded; one is selected. Selection
  priority: `?rel=` (only if it's one of mine) > localStorage
  `active_relationship` > newest. Unknown `?rel=` is ignored.
- `?rel=` is written (absolute `replaceState`) only when the user has
  more than one pair, so single-pair URLs stay clean.
- Pair badge menu: pairs by partner name ("Switch") plus "Pair with
  someone new", which opens the pairing flow while paired with a "Back
  to my pair" bar.
- Switching remounts the dashboard per pair and resets per-relationship
  data (points, coupons, claims); stale responses from the previous
  pair are dropped.
- The inviter's pairing poll detects a NEW relationship (not one known
  when the flow opened), so an already-paired user can invite again.
  Both success paths select the new pair.
- Reset account clears `active_relationship`. The recovery prompt stays
  per relationship.

## Verification

- Unit tests for the pure selection logic and pairing flow.
- Two-pair user: switching changes notes/coupons/balance; reload keeps
  the selection; `?rel=` opens that pair; unknown `?rel=` ignored;
  pairing a third person while paired works.

## Later changes

- Dashboard remounts only on pair id change; loading gates cover first
  load only (design session 2026-10-01).
- Inviter key handoff no longer relies only on the poll (frozen in
  background tabs): any relationship refresh moves the temp invite key
  onto the new pair; both sides see a full-screen "paired" moment, then
  the one-time recovery prompt.
- Already-paired user opening a pairing link -> new-pair flow (D-UX.2).
- On mobile the pair name sits in the app bar (PRD-49 and 2026-10-01
  app bar redesign).
