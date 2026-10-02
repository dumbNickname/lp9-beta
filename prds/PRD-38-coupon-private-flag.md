# PRD-38 — Per-coupon private flag (device-local)

> Status: see `PROGRESS.md`.
> Later changes: privacy mode reworked (DESIGN §15c amended 2026-10-01);
> see below.

## Goal

Let a user mark coupons private on this device; with privacy mode on
they render as a hidden placeholder (`DESIGN.md` §15b).

## What shipped

- Device-local set of private coupon ids in `localStorage`
  (`private_coupons`), read defensively. Never sent to the server; the
  partner is unaffected.
- "Mark private" / "Unmark private" action on each card.
- With privacy mode on, private coupons show a placeholder ("Hidden
  coupon — turn off private mode to view").
- "Reset account" clears the set.

## Decisions

- **D-38.1** No `@solid-primitives/storage`: a plain signal with
  try/catch localStorage behaves the same and avoids a dependency plus
  pnpm release-age friction. §15b named the lib; the behaviour is what
  matters.

## Verification

- Unit tests.

## Later changes

- DESIGN §15c amended 2026-10-01: privacy mode is OFF by default,
  remembered per device; one eye toggle in the app bar (Settings
  mirrors). Veiled private wishes are tappable -> "show this one / turn
  mode off / keep hidden"; one-time hint. The veil replaced the
  placeholder's old "Unmark" shortcut.
