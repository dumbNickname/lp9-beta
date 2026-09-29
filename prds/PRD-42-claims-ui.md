# PRD-42 — Claims UI: claim, respond, deliver, history

## Goal
Spend hearts. The claimer taps "Claim" on an affordable Ready coupon
(confirm shows price + resulting balance). The deliverer sees "Ben
wants: Breakfast in bed" with Accept (optional date + note) / Decline
(reason). Accepted claims show "Mark delivered"; either can cancel with a
refund. The claimer can withdraw while pending, and nudge after 7 days.

## Scope
- `src/lib/stores/claims.ts` (sweep then list on refresh), and a
  `ClaimsPanel.tsx` at the top of the Coupons tab: "Waiting for you"
  (deliverer actions), "Your claims" (status + withdraw/nudge),
  "Coming up".
- `ComingUp.tsx`: 14-day strip (today..+13) with day cells; accepted
  claims with a date are placed on their day, undated accepted ones are
  listed as "Some day soon". Visible to both partners.
- History (collapsed): delivered / declined / withdrawn / cancelled /
  auto-refunded, newest first, last 20.
- Balance line: "N hearts to spend", plus "(M set aside)" when escrow
  > 0 (shows own escrow only).
- Coupon cards: "Claim" button on my affordable Ready coupons; "Claimed"
  chip when an open claim exists.
- Copy stays warm, no scorekeeping. Declined/cancelled copy says
  hearts were returned.

## Verification
Live 2-partner E2E: give hearts -> approve coupon -> claim -> balance
drops -> partner accepts with date -> shows in Coming up on both ->
delivered -> history. Decline refunds. Withdraw refunds.

---

## Dev notes
- `ClaimRow.tsx` (+ `ClaimList`, `claimStatusText`): deliverer "Yes,
  let's plan it" (optional date + note) / "Not right now" (reason);
  accepted -> "Mark delivered"; either side Cancel. Claimer Withdraw,
  and "Send a gentle reminder" after 7 days (client check; server
  enforces).
- `ComingUp.tsx`: 14-day, 7-column strip with dot days + a plan list;
  undated accepted = "Some day soon"; beyond 14 days = "Later".
- The Coupons tab order is: "For you to give" (claims awaiting me),
  "Your claims", Coming up, then the wish lists. History toggle (last
  20 closed claims).
- Claim confirm uses `window.confirm` with the price + "returned if it
  doesn't happen" copy.
- Balance line shows "N set aside for claims" when escrow > 0.
- `src/lib/stores/claims.ts`: `refreshClaims` sweeps first (§5f lazy
  refund), then lists.
- Tests: `tests/unit/claims-ui.test.tsx`, `tests/unit/claims-data.test.ts`.
