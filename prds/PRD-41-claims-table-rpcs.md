# PRD-41 — `coupon_claims` table + RLS + escrow RPCs

> Ambiguity -> STOP, load `grill-me`. Rules: `DESIGN.md` §5e, §5f
> (resolved 2026-09-29), §13a, §13b, §13d.

## Goal
Server-enforced claim lifecycle with escrow: claim -> accept (optional
date + note) -> deliver, plus decline, withdraw, cancel, nudge, a lazy
14-day auto-refund, and retire refunds.

## Scope
Migration `0008_coupon_claims.sql`:
- Table `coupon_claims` per §13a (amended): `id`, `coupon_id` FK cascade,
  `relationship_id`, `claimer_id`, `deliverer_id`, `price_at_claim int
  check > 0`, `status` in pending/accepted/declined/delivered/
  auto_refunded/withdrawn/cancelled, `scheduled_date date`,
  `accept_note <= 200`, `decline_reason <= 200`, `cancel_note <= 200`,
  `cancelled_by`, timestamps `claimed_at` default now(), `accepted_at`,
  `declined_at`, `delivered_at`, `withdrawn_at`, `cancelled_at`,
  `auto_refunded_at`, `nudged_at`.
- Partial unique index: one open (`pending`/`accepted`) claim per coupon.
- Indexes (§13e): `(relationship_id, status)`, `(deliverer_id, status)`.
- RLS: SELECT for members only; writes via RPC.
- `spendable_hearts(p_rel_id, p_user) returns int` (definer, internal):
  received live points − price of pending/accepted/delivered claims.
- RPCs (definer, `search_path=''`, row locks):
  - `claim_coupon(p_coupon_id) returns uuid`: caller = coupon receiver,
    coupon approved, relationship active, no open claim, and
    `spendable >= price`. Serialize per claimer via
    `pg_advisory_xact_lock` so two parallel claims can't overspend.
    Messages: `not the receiver`, `coupon not available`,
    `already claimed`, `not enough hearts`.
  - `accept_claim(p_claim_id, p_date date, p_note text)`: deliverer,
    pending -> accepted. The date, if given, must be today..today+365.
  - `decline_claim(p_claim_id, p_reason)`: deliverer, pending -> declined.
  - `deliver_claim(p_claim_id)`: deliverer, accepted -> delivered.
    (Must accept first; accept is one tap.)
  - `withdraw_claim(p_claim_id)`: claimer, pending -> withdrawn.
  - `cancel_claim(p_claim_id, p_note)`: either member, accepted ->
    cancelled.
  - `nudge_claim(p_claim_id)`: claimer, pending, claimed >= 7 days ago,
    `nudged_at` null or >= 24h ago. Sets `nudged_at` (email is Phase 6).
  - `sweep_expired_claims(p_rel_id) returns int`: member; pending claims
    with `claimed_at < now() - 14 days` -> auto_refunded. Returns the
    count.
- Amend `retire_coupon`: open claims on that coupon -> `cancelled`,
  `cancel_note = 'coupon retired'`.
- Data layer `src/lib/data/claims.ts` + types; `computeSpendable` is fed
  my claims.

## Verification (live smoke)
Balance math, not-enough rejection, parallel double-claim blocked, one
open claim per coupon, each transition actor-restricted, invalid
transitions rejected, retire refunds, sweep refunds a backdated claim
(test via `claimed_at` can't be forged -> verify the function body
through SQL-text QA + returns 0 live), outsider blocked.

---

## Dev notes

- Migration `0008_coupon_claims.sql`. The internal helpers
  `spendable_hearts`, `load_claim_for_update` and `check_claim_note`
  have EXECUTE revoked from API roles (the first two).
- Race safety: `pg_advisory_xact_lock(hashtextextended(rel||claimer))`
  before the balance check, plus the partial unique index on open
  claims per coupon.
- `accept_claim` date window: `current_date - 1` .. `+365` (the -1
  tolerates timezones).
- **Live smoke 2026-09-29: 30/30 pass**, including the parallel
  double-claim race (exactly one wins), every actor restriction,
  deliver-before-accept rejected, cancel/decline/withdraw/retire
  refunds, delivered = spent, outsider blocked, internal helpers not
  callable.
- Not live-tested: nudge after 7d and the sweep after 14d (needs time
  travel); logic is in SQL.
