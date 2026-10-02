# PRD-54 — Lock down relationship writes + helper grants (security)

> From `REVIEW.md` #1 (HIGH) and #2 (MEDIUM). Do this first.

## Goal
No member can change a relationship row directly, and internal helper
functions are not callable through the API.

## Scope
- Migration `0010_lock_relationship_writes.sql`:
  - `drop policy "members update relationship" on public.relationships;`
    (all legitimate writes go through `set_recovery_password` /
    `redeem_pair_code`, which are SECURITY DEFINER).
  - `revoke execute ... from public, anon, authenticated` on:
    `gen_pair_code()`, `check_point_comment(bytea, bytea)`,
    `check_coupon_fields(text, text, text, text, int)`, `coupon_opt(text)`,
    `check_claim_note(text)`, `handle_new_user()`. Keep
    `is_relationship_member(uuid)` callable only if RLS needs it (it is
    used in policies; policies run as the caller -> keep EXECUTE for
    `authenticated`, revoke from `anon`/`public`).
- Check every RPC used by the client still works (the live E2E flows).

## Verification
The live probe in `REVIEW.md` #1: B's direct updates to status /
member_a / wrap columns affect 0 rows or error; outsider
`rpc("gen_pair_code")` -> permission denied; pairing, recovery set /
restore, hearts, coupons and claims still work end-to-end.

## Dev notes
- Migration `0010` as scoped. The client never writes `relationships`
  directly (only `profiles`), so no app code changes.
- Static guard test: no surviving write policy on `relationships`;
  listed helpers revoked; `is_relationship_member` kept for
  `authenticated` only.
- Live probe runs after the migration is applied by the push to
  `master`.
