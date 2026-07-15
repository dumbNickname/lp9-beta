# PRD-15 — `relationships` + `pairing_invites` tables + RLS

## Goal

Create the `relationships` and `pairing_invites` tables with RLS so the
pairing flow (PRD-16) has schema to work against.

## Scope

**In:**
- Migration `supabase/migrations/NNNN_relationships_pairing.sql` per
  `DESIGN.md` §13a:
  - `relationships`: `id` uuid PK, `member_a`/`member_b` uuid FK→
    profiles.id, `archetype` text (`getting_to_know|established_couple|
    close_friends`), `status` text (`active|archived`, default `active`),
    `created_at`, `paired_at` timestamptz. Encryption-recovery columns
    (nullable): `wrapped_key_blob` bytea, `wrap_salt` bytea,
    `wrap_iterations` int, `wrap_algo` text.
    - `CHECK (member_a <> member_b)`.
    - `UNIQUE (LEAST(member_a, member_b), GREATEST(member_a, member_b))`.
  - `pairing_invites`: `id` uuid PK, `code` text UNIQUE, `created_by`
    uuid FK→profiles.id, `archetype` text, `expires_at` timestamptz
    default `now() + interval '24 hours'`, `consumed_at` timestamptz
    nullable.
- `is_relationship_member(rel_id uuid)` helper function (§13c),
  `SECURITY DEFINER STABLE`.
- RLS (§13c):
  - `relationships`: SELECT/UPDATE only if `is_relationship_member`;
    INSERT only via RPC (deny direct insert — PRD-16 uses SECURITY
    DEFINER).
  - `pairing_invites`: SELECT own (`created_by = auth.uid()`); INSERT
    own; redemption via RPC (PRD-16).

**Out:**
- The pairing RPCs themselves (`create_pair_invite`, `redeem_pair_code`)
  — PRD-16.
- The `profiles` co-member SELECT policy update (add when relationships
  exist — do it here or PRD-16; flag in Dev notes).
- Encryption key generation / recovery-password write (PRD-17, PRD-22).
- Any UI (PRD-21).

## Touched files / new files

- `supabase/migrations/NNNN_relationships_pairing.sql` — new.

## Data model impact

- New tables `relationships`, `pairing_invites`; helper function
  `is_relationship_member`; RLS policies on both tables.

## UI behavior

None.

## Verification

1. Migration applies clean on a preview branch (Supabase check green).
2. RLS: a non-member cannot SELECT a relationship row; a member can.
3. `pairing_invites`: creator sees own invites; others cannot.
4. Unique constraint prevents duplicate relationship for the same pair.
5. `CHECK (member_a <> member_b)` rejects self-pairing.

**Unit tests (Dev):** N/A (SQL) — verified via preview branch.

**QA suite:**
- Adversarial (RLS): as user A, attempt SELECT/UPDATE a relationship
  A is not a member of → denied.
- Attempt direct INSERT into `relationships` (bypassing RPC) → denied.
- Insert two relationships for the same member pair → unique violation.
- Expired invite behavior is enforced by RPC (PRD-16), not schema —
  note it.

## Open questions

- Add the `profiles` co-member SELECT policy (§13c) here or in PRD-16?
  Dev decides and records; it needs `is_relationship_member`, which this
  PRD introduces.

## Dev notes

**Migration:** `supabase/migrations/0002_relationships_pairing.sql`

**Decisions:**
- Added the `profiles` co-member SELECT policy HERE (not PRD-16) — this
  PRD introduces the relationship linkage the policy needs. Policy uses
  a direct EXISTS on `relationships` (not `is_relationship_member`,
  which takes a rel_id, not a profile id).
- Unique index uses `least/greatest` on member pair per §13a.
- No INSERT policy on `relationships` — direct insert denied; PRD-16
  RPC (`SECURITY DEFINER`) creates rows.
- `on delete cascade` on member FKs — GDPR account delete cascades.
- `gen_random_uuid()` for PKs (pgcrypto/pg built-in).

**Self-test:** SQL-only; applied via Supabase preview/prod on merge.
Local `pnpm` checks unaffected (no app code changed).
