# PRD-35 — `coupons` table + RLS + RPCs + data layer

> Tiny PRD per `DESIGN.md` §16b. Ambiguity -> STOP, load `grill-me`.

## Goal

Server + data layer for wishlists: `coupons` table, member-read RLS, and
RPCs enforcing who may do what (`DESIGN.md` §6, §13a amended
2026-09-29).

## Scope

**In:** migration `0007_coupons.sql`:
- Table per §13a: `title` 1..80 chars, `description` <= 300,
  `boundaries_note` <= 300, `emoji` <= 16 bytes, `price` 1..50,
  `status` in draft/approved/declined/retired, `decline_note` <= 200,
  `template_key` <= 64, timestamps. `receiver_id <> giver_id`. Index
  `(relationship_id, status)`.
- RLS: SELECT only, `is_relationship_member(relationship_id)`. No direct
  writes.
- RPCs (`security definer`, `search_path = ''`, stable messages):
  - `submit_coupon(p_rel_id, p_title, p_description, p_boundaries,
    p_emoji, p_price, p_template_key) returns uuid`: the caller becomes
    the receiver, the giver is derived as the other member. Relationship
    must be active.
  - `update_coupon_draft(p_coupon_id, same fields) returns void`:
    receiver only, status must be `draft` (a `declined` coupon can't be
    edited).
  - `delete_coupon(p_coupon_id)`: receiver only, status draft or
    declined (hard delete).
  - `approve_coupon(p_coupon_id)`: giver only, draft -> approved, sets
    `approved_at`.
  - `decline_coupon(p_coupon_id, p_note)`: giver only, draft ->
    declined, sets `declined_at`, `decline_note`.
  - `retire_coupon(p_coupon_id)`: **either member**, approved -> retired
    (D-35.1). Claim refunds land with Phase 5.
  - Messages: `not authenticated`, `not a relationship member`,
    `relationship not active`, `invalid title`, `invalid price`,
    `invalid field`, `not found`, `not the receiver`, `not the giver`,
    `invalid status`.
- `src/lib/data/coupons.ts`: `listCoupons(relId)` plus the RPC wrappers
  and `friendlyCouponError`. Types in `types.ts`.

**Out:** UI (PRD-36+), claims (Phase 5).

## Verification

Live smoke (2 anon clients): A submits -> both see it as draft; B can't
edit/delete it; A edits the draft; B approves; A can't approve its own
coupon; approved can't be edited; B declines another -> A sees the note,
deletes it; price 0/51 rejected; outsider sees nothing; direct insert
blocked.

## Open questions

None (D-35.1 in `no-human-decisions.md`).
