# PRD-30 — Spendable balance

> Tiny PRD per `DESIGN.md` §16b. Ambiguity -> STOP, load `grill-me`.

## Goal

Show the user their own spendable heart balance for the relationship,
computed (never stored) per `DESIGN.md` §13b.

## Scope

**In:**
- `src/lib/balance.ts` (new) pure fn `computeSpendable(points, claims,
  userId)` = received (not deleted) − escrowed − spent. `claims` is `[]`
  until Phase 5; signature ready for it.
- Derived memo in points store: `mySpendable()`.
- UI: a quiet "You have N hearts to spend" line near the composer. Only
  the viewer's own balance; **never** partner's balance, never
  given-vs-received comparison (§5b, no scoreboard).
- Coupons don't exist yet -> subtitle "Coupons are coming soon".

**Out:** server-side balance check (lands with `claim_coupon`, Phase 5);
lifetime totals UI (never).

## Touched files / new files

- `src/lib/balance.ts` (new), `src/lib/stores/points.ts`,
  `src/routes/app.tsx` (or dashboard component), `global.css`
- `tests/unit/balance.test.ts`

## Verification

1. Sum excludes given hearts and deleted rows.
2. Escrow/spent subtract when claims provided (unit only for now).
3. Partner balance not rendered.

**Note:** feed is limited to 50 rows; balance must NOT be computed from
the paginated feed. Use a separate lightweight query
(`select amount` where receiver = me, not deleted) — D-30.1.

## Open questions

None.

---

## Dev notes

- `src/lib/balance.ts` `computeSpendable(amounts, claims=[])`. Claims
  in pending/accepted/delivered subtract; declined/auto_refunded don't.
- Amounts come from `listReceivedAmounts` (separate query, D-30.1).
- UI: a serif line in the dashboard head. Shows only the viewer's own
  number; shows zero-state copy when 0.
