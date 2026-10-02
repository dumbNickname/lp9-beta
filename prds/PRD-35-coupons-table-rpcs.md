# PRD-35 — `coupons` table + RLS + RPCs + data layer

> Status: see `PROGRESS.md`.

## Goal

Server and data layer for wishlists: a `coupons` table, member-read RLS,
and RPCs that enforce who may do what (`DESIGN.md` §6, §13a amended
2026-09-29).

## What shipped

- Table `coupons` (§13a): `title` 1..80 chars, `description` <= 300,
  `boundaries_note` <= 300, `emoji` <= 16 bytes, `price` 1..50,
  `status` draft/approved/declined/retired, `decline_note` <= 200,
  `template_key` <= 64, timestamps (`approved_at`, `declined_at`, ...).
  `receiver_id <> giver_id`. Index `(relationship_id, status)`.
- RLS: SELECT only, for relationship members. No direct writes; all
  writes via definer RPCs (`search_path = ''`, stable error messages).
- State machine: draft -> approved | declined; approved -> retired.
  Declined drafts can't be edited, only deleted.
- RPCs and who may call them:
  - `submit_coupon(rel, title, description, boundaries, emoji, price,
    template_key) returns uuid`: caller becomes the receiver; giver is
    the other member. Relationship must be active.
  - `update_coupon_draft`: receiver only, status draft.
  - `delete_coupon`: receiver only, draft or declined (hard delete).
  - `approve_coupon`: giver only, draft -> approved.
  - `decline_coupon(coupon, note)`: giver only, draft -> declined.
  - `retire_coupon`: either member, approved -> retired (D-35.1). Open
    claims on it are refunded (added by PRD-41).
- Messages: `not authenticated`, `not a relationship member`,
  `relationship not active`, `invalid title`, `invalid price`,
  `invalid field`, `not found`, `not the receiver`, `not the giver`,
  `invalid status`. Client maps them to friendly copy.
- Empty optional fields are trimmed to null. Internal helpers have
  EXECUTE revoked from API roles.

Out: UI (PRD-36+), claims (PRD-41).

## Decisions

- **D-35.1** Either member may retire an approved coupon. Why: the
  receiver may stop wanting it too, and retiring only refunds, so no
  harm. Alternative was giver-only per §6b literal.

## Verification

- Live smoke with two anonymous clients plus an outsider: submit and
  normalise, price/title bounds (0 and 51 rejected), receiver-only
  edit/delete, giver-only approve/decline, approved immutable, decline
  note visible, retire, outsider sees nothing, direct insert blocked,
  internal helpers not callable. All passed.
