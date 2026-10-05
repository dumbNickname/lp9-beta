# PRD-41 — `coupon_claims` table + RLS + escrow RPCs

> Status: see `PROGRESS.md`. Rules: `DESIGN.md` §5e, §5f (resolved
> 2026-09-29), §13a, §13b, §13d.

## Goal

Server-enforced claim lifecycle with escrow: claim -> accept (optional
date + note) -> deliver, plus decline, withdraw, cancel, nudge, a lazy
14-day auto-refund, and refunds when a coupon is retired.

## What shipped

- Table `coupon_claims` (§13a amended): coupon (FK cascade),
  relationship, `claimer_id`, `deliverer_id`, `price_at_claim > 0`,
  `status`, `scheduled_date`, `accept_note` / `decline_reason` /
  `cancel_note` (each <= 200), `cancelled_by`, and a timestamp per
  transition (`claimed_at`, `accepted_at`, `declined_at`,
  `delivered_at`, `withdrawn_at`, `cancelled_at`, `auto_refunded_at`,
  `nudged_at`).
- State machine: pending -> accepted | declined | withdrawn |
  auto_refunded; accepted -> delivered | cancelled. Delivered = spent;
  every other end state refunds.
- Escrow: hearts are set aside at claim time.
  `spendable_hearts(rel, user)` = received live points minus price of
  pending + accepted + delivered claims (internal, not API-callable).
- One open (pending/accepted) claim per coupon (partial unique index).
  Indexes `(relationship_id, status)`, `(deliverer_id, status)` (§13e).
- RLS: SELECT for members; writes only via definer RPCs with row locks.
- RPCs and who may call them:
  - `claim_coupon(coupon) returns uuid`: the coupon's receiver; coupon
    approved, relationship active, no open claim, spendable >= price.
    Serialised per claimer with an advisory lock so parallel claims
    can't overspend. Messages: `not the receiver`, `coupon not
    available`, `already claimed`, `not enough hearts`.
  - `accept_claim(claim, date, note)`: deliverer, pending -> accepted.
    Optional date in today-1..today+365 (the -1 tolerates timezones).
  - `decline_claim(claim, reason)`: deliverer, pending -> declined.
  - `deliver_claim(claim)`: deliverer, accepted -> delivered (must
    accept first; accept is one tap).
  - `withdraw_claim(claim)`: claimer, pending -> withdrawn.
  - `cancel_claim(claim, note)`: either member, accepted -> cancelled.
  - `nudge_claim(claim)`: claimer, pending, claimed >= 7 days ago, last
    nudge null or >= 24h ago; sets `nudged_at` (email is Phase 6).
  - `sweep_expired_claims(rel) returns int`: any member; pending claims
    older than 14 days -> auto_refunded. Lazy: the client calls it on
    refresh (§5f).
- `retire_coupon` amended: open claims on the coupon -> cancelled with
  `cancel_note = 'coupon retired'`.

## Verification

- Live smoke with two anonymous clients plus an outsider: balance math,
  not-enough rejection, parallel double-claim race (exactly one wins),
  one open claim per coupon, every actor restriction, deliver before
  accept rejected, cancel/decline/withdraw/retire refunds, delivered =
  spent, outsider blocked, internal helpers not callable. All passed.
- Not live-tested (needs time travel; `claimed_at` can't be forged):
  nudge after 7 days and sweep after 14 days. Checked by SQL review;
  sweep returns 0 live.

## Later changes

- `deliver_claim` open to either member, records `delivered_by` (PRD-56).
