# PRD-42 — Claims UI: claim, respond, deliver, history

> Status: see `PROGRESS.md`.
> Later changes: the claims sections now live in the PRD-49 worlds.

## Goal

Spend hearts. The claimer taps "Claim" on an affordable Ready coupon.
The deliverer sees "Ben wants: Breakfast in bed" and can accept
(optional date + note) or decline (reason). Accepted claims can be
marked delivered; either can cancel with a refund. The claimer can
withdraw while pending and nudge after 7 days.

## What shipped

- Claim confirm shows the price and says hearts are returned if it
  doesn't happen.
- Deliverer actions: "Yes, let's plan it" (optional date + note) / "Not
  right now" (reason); accepted -> "Mark delivered"; either side Cancel.
- Claimer actions: Withdraw while pending; "Send a gentle reminder"
  after 7 days (client check, server enforces).
- Order on the old Coupons tab: "For you to give" (claims awaiting me),
  "Your claims", Coming up, then the wish lists.
- Coming up: 14-day, 7-column strip (today..+13) with dot days and a
  plan list; undated accepted claims = "Some day soon"; beyond 14 days =
  "Later". Visible to both partners.
- History (collapsed toggle): last 20 closed claims (delivered /
  declined / withdrawn / cancelled / auto-refunded), newest first.
- Balance line: hearts to spend, plus "N set aside for claims" when my
  own escrow > 0.
- Coupon cards: "Claim" on my affordable Ready coupons (PRD-40);
  "Claimed" chip when an open claim exists.
- Every refresh runs `sweep_expired_claims` first, then lists (§5f lazy
  refund).
- Copy warm, no scorekeeping; declined/cancelled copy says hearts were
  returned.

## Verification

- Unit tests for UI and data layer.
- Live two-partner E2E: give hearts -> approve coupon -> claim ->
  balance drops -> partner accepts with date -> shows in Coming up on
  both -> delivered -> history. Decline and withdraw refund.

## Later changes

- Notes/Coupons tabs replaced by three worlds Give / My wishes / For
  partner (PRD-49); claim sections moved with their lists.
- "Mark delivered" (giver only) became "We did it" for either partner;
  status shows "Done" (PRD-56).
