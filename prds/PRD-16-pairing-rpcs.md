# PRD-16 — Pairing RPCs (`create_pair_invite`, `redeem_pair_code`)

> Status: see `PROGRESS.md`.

## Goal

Server-side RPCs that create a short-lived pairing invite and redeem a
code into a `relationships` row, enforcing expiry and single-use.

## What shipped

- `create_pair_invite(archetype) returns text`: inserts an invite for
  `auth.uid()` with a generated short opaque code; returns the code.
- `redeem_pair_code(code) returns uuid`: finds an unconsumed, unexpired
  invite; rejects self-pairing and an already-existing pair; creates the
  relationship (`member_a = created_by`, `member_b = auth.uid()`,
  archetype from the invite, `paired_at = now()`); marks the invite
  consumed; returns the relationship id.
- `revoke_pair_invite(code)`: the inviter deletes their own unconsumed
  invite (HANDOFF Q-A).
- All three `SECURITY DEFINER` with `search_path = ''`.
- The encryption key never passes through these RPCs; it travels in the
  invite QR/link only (§13a, PRD-17/PRD-19).
- Out: recovery-password write (PRD-22), UI (PRD-21).

## Decisions

- Included `revoke_pair_invite` now rather than deferring.
- Code scheme: 8 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no
  ambiguous 0/O/1/I/L); insert retries up to 5x on collision.
- Race safety: redeem locks the invite row (`SELECT ... FOR UPDATE`), so
  a concurrent double-redeem yields one relationship.
- Redeemer is always the caller, so nobody can pair two arbitrary users.
- Invalid vs expired/consumed codes give distinct plain error messages;
  acceptable since codes are high-entropy (30^8) and enumeration is not
  a practical risk.

## Verification

- Migration applied via Supabase preview/prod (SQL-only).
- QA: double redeem (incl. concurrent) creates one relationship;
  expired, consumed, unknown and own codes are rejected; both members
  can SELECT the new relationship.
