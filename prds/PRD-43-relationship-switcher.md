# PRD-43 — Multiple relationships: switcher + `?rel=`

## Goal
One account can hold several pairs (the §4 data model already allows it).
The owner wants a test pair alongside a real partner. Switch from the
pair badge; the choice is remembered per device, and `?rel=<id>` in the
URL selects one (bookmarkable).

## Scope
- Relationship store: `relationships()` (all active), `relationship()`
  = selected. Selection priority: `?rel=` (if it's one of mine) >
  localStorage `active_relationship` > newest.
- PairBadge: when >1 pair or on tap, a menu lists pairs by partner name
  plus "Pair with someone new" (opens PairFlow while paired; cancel
  returns). Switching updates `?rel=` via absolute replaceState and
  refreshes all stores.
- Per-relationship stores reset on switch (points, coupons, claims).
- PairFlow polling: detect a NEW relationship (not in the known set)
  instead of any active one, so an already-paired user can invite again.
- Reset-account clears `active_relationship`.
- The recovery prompt stays per relationship (already keyed).

## Verification
User with two pairs: switch -> notes/coupons/balance change; reload
keeps the selection; `?rel=` opens that pair; an unknown `?rel=` is
ignored; pairing a third person while paired works.
