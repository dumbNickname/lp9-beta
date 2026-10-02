# PRD-30 — Spendable balance

> Status: see `PROGRESS.md`.
> Later changes: coupons and claims shipped (PRD-35..42), so the
> "coming soon" subtitle and the empty claims list no longer apply; the
> balance now shows in the app bar heart wallet strip.

## Goal

Show the user their own spendable heart balance for the pair, computed
(never stored) per `DESIGN.md` §13b.

## What shipped

- Spendable = hearts received (not deleted) - escrowed - spent. Claims
  that are pending/accepted/delivered subtract; declined/auto-refunded do
  not.
- Only the viewer's own balance is shown; never the partner's, never a
  given-vs-received comparison (§5b, no scoreboard). Zero-state copy
  when 0.
- Originally: a quiet serif line near the composer with "Coupons are
  coming soon".

Out: server-side balance check (lands with claims); lifetime totals UI
(never).

## Decisions

- **D-30.1** Balance comes from a dedicated received-amounts query, not
  the feed. Why: the feed is limited to 50 rows; the balance must count
  everything.

## Verification

- Unit tests: given hearts and deleted rows excluded; escrow/spent
  subtract by claim status; partner balance not rendered.
