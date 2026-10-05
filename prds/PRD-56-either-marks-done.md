# PRD-56 — Either partner marks a wish done

## Goal
An accepted claim can be marked done by either partner, not only the
giver. Trust is the model; one tap from either side finishes it.

## What shipped
- Migration `0013_either_marks_done`: `coupon_claims.delivered_by`
  (who tapped it); `deliver_claim` accepts either member, accepted
  only; status stays `delivered` (no new state, balance unchanged).
- Push `delivered` goes to the other partner (whoever did not tap);
  copy "Done together".
- UI: both sides see "We did it" on accepted claims; status reads
  "Done"; Details show "Marked done by You / <partner>".

## Decisions
- D-56.1 Either side, no two-step confirm (owner 2026-10-05). A
  wisher-confirms flow stays possible later if trust issues appear.
- D-56.2 Internal status name `delivered` kept for compatibility; UI
  says "Done".
- D-56.3 History unchanged: "Past claims" (My wishes) and "Given
  before" (For partner) list the last 20 closed claims each.

## Verification
- Unit: claimer and deliverer both get "We did it" and call
  `deliver_claim`; done claim shows "Done" and who marked it.
- Live: two anonymous users; claimer marks an accepted claim done ->
  status Done on both sides, balance spent once.
