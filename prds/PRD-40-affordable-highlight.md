# PRD-40 — Highlight coupons I can afford

> Status: see `PROGRESS.md`.

## Goal

On my own "I'd love" list, approved coupons whose price <= my spendable
balance are visibly highlighted, so saving up feels tangible. Owner
request 2026-09-29.

## What shipped

- Affordable = my coupon, approved, and `price <= spendable`. Shown with
  a rose edge, soft glow and a "You have enough" chip; it also enables
  the "Claim" button (PRD-42).
- Spendable = received hearts minus pending + accepted + delivered
  claims; matches the server's `spendable_hearts` (PRD-41).
- Never on drafts or on the partner's list (no scoreboard).

Out: progress bars (anti-pattern, PRD-32).

## Verification

- Unit tests: balance 8 -> my approved 8-heart coupon highlighted, a
  10-heart one not; drafts and partner coupons never highlighted.

## Later changes

- My list lives in the My wishes world (PRD-49).
