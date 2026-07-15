# PRD-16 — Pairing RPCs (`create_pair_invite`, `redeem_pair_code`)

## Goal

Server-side RPCs that create a short-lived pairing invite and redeem a
code into a `relationships` row, enforcing expiry and single-use.

## Scope

**In:**
- Migration `supabase/migrations/NNNN_pairing_rpcs.sql`:
  - `create_pair_invite(archetype text) returns text` — inserts a
    `pairing_invites` row for `auth.uid()` with a generated short opaque
    `code` (e.g. 8 chars, collision-checked), returns the code.
  - `redeem_pair_code(code text) returns uuid` — `SECURITY DEFINER`:
    looks up an unconsumed, unexpired invite by code; rejects
    self-pairing (`created_by = auth.uid()`); rejects if the pair
    already has a relationship; creates the `relationships` row
    (`member_a = created_by`, `member_b = auth.uid()`, archetype from
    the invite, `paired_at = now()`); marks the invite consumed; returns
    the new relationship id.
  - Both `SECURITY DEFINER` with `search_path = ''`.
- Revocability: allow the inviter to revoke an unconsumed invite
  (`revoke_pair_invite(code text)`), per HANDOFF Q-A. (Confirm in Open
  questions if this belongs here or later.)

**Out:**
- Encryption key handling — the key travels in the QR payload, never
  through these RPCs (§13a note, PRD-17/PRD-19).
- Recovery-password write (`set_recovery_password`) — PRD-22.
- UI (PRD-21).

## Touched files / new files

- `supabase/migrations/NNNN_pairing_rpcs.sql` — new.

## Data model impact

- New RPCs: `create_pair_invite(archetype)`, `redeem_pair_code(code)`,
  `revoke_pair_invite(code)` (if included). No new tables (uses PRD-15).

## UI behavior

None (called by PRD-21).

## Verification

1. Migration applies clean on a preview branch.
2. `create_pair_invite` returns a unique code; row is visible to creator
   only.
3. `redeem_pair_code` by a different user creates the relationship, both
   members can then SELECT it, invite is marked consumed.
4. Redeeming a consumed or expired code → clear error, no relationship.
5. Redeeming own code (self-pair) → rejected.
6. Redeeming when a relationship already exists for the pair → rejected
   (unique + explicit check).

**Unit tests (Dev):** N/A (SQL) — verified via preview branch.

**QA suite:**
- Adversarial: redeem the same code twice concurrently → only one
  relationship (race / single-use).
- Redeem an expired code → denied.
- Redeem a random non-existent code → denied, no leak of whether codes
  exist.
- Attempt to call `redeem_pair_code` to pair two users neither of whom
  is the caller → impossible (member_b is always `auth.uid()`).

## Open questions

- Include `revoke_pair_invite` now (HANDOFF Q-A) or defer? Dev decides
  and records.
- Code generation: length/charset and collision-retry strategy — Dev
  picks a reasonable opaque scheme (avoid ambiguous chars) and records.
