# PRD-55 — Security follow-ups: signed-in RPCs, invites, profiles, push

> From the review loop recorded in `REVIEW.md` ("security review loop").

## Goal
Shrink the API surface: nothing callable without sign-in, no direct
invite inserts, profile writes limited to user-editable columns, push
subscriptions bounded.

## What shipped
- Migration `0011_rpc_signed_in_only`: every API RPC executes for
  `authenticated` only (anonymous sign-in is `authenticated`), revoked
  from PUBLIC/anon; default privileges stop granting new functions to
  PUBLIC/anon.
- Migration `0012_security_followups`:
  - drop the `pairing_invites` INSERT policy (invites only via
    `create_pair_invite`);
  - `profiles` UPDATE granted only on `display_name`, `locale`, `theme`;
    `display_name` at most 50 chars (`not valid`: old rows untouched);
  - `save_push_subscription` accepts only Google, Mozilla, Apple and
    Windows push endpoints; keeps the 10 newest devices per user.
- No app code change needed: the client writes `profiles` with those
  three columns only and never inserts invites directly.

## Verification
- Static test guards the grants, dropped policy and endpoint allow-list.
- Live probe after deploy: anon (no session) RPC call -> permission
  denied; direct invite insert -> RLS error; profile update of `id` or
  `created_at` -> permission denied; bad push endpoint -> "invalid
  subscription"; pairing, hearts, wishes, claims and profile rename
  still work end-to-end with two anonymous users.
