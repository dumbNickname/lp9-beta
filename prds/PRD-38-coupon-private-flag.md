# PRD-38 — Per-coupon private flag (device-local)

> Tiny PRD per `DESIGN.md` §15b.

## Goal

Mark coupons private on this device. With private mode ON they render as
a locked placeholder row.

## Scope

**In:** `src/lib/privateCoupons.ts`, a Set of coupon ids persisted in
`localStorage` (`private_coupons`). **D-38.1:** plain signal +
defensive localStorage, not `@solid-primitives/storage` (avoids a
dependency + the pnpm release-age policy; same behaviour). The
"Mark private"/"Unmark" action is on each card. Placeholder: "Hidden
coupon — turn off private mode to view". The partner is unaffected.
The privacy toggle also shows on the Coupons tab.
