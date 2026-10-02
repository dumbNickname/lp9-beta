# PRD-15 — `relationships` + `pairing_invites` tables + RLS

> Status: see `PROGRESS.md`.

## Goal

Create the `relationships` and `pairing_invites` tables with RLS so the
pairing RPCs (PRD-16) have schema to work against.

## What shipped

- `relationships` (`DESIGN.md` §13a): `id`, `member_a`/`member_b`
  (FK -> profiles), `archetype` (`getting_to_know|established_couple|
  close_friends`), `status` (`active|archived`, default `active`),
  `created_at`, `paired_at`. Nullable recovery columns:
  `wrapped_key_blob`, `wrap_salt`, `wrap_iterations`, `wrap_algo`.
  - `CHECK (member_a <> member_b)`: no self-pairing.
  - Unique on `(LEAST(member_a, member_b), GREATEST(...))`: one
    relationship per pair regardless of order.
- `pairing_invites`: `id`, `code` UNIQUE, `created_by`, `archetype`,
  `expires_at` default now + 24h, `consumed_at` nullable.
- Helper `is_relationship_member(rel_id)`, `SECURITY DEFINER STABLE`
  (§13c).
- RLS:
  - `relationships`: SELECT/UPDATE only for members; no INSERT policy,
    so rows are created only by the PRD-16 definer RPC.
  - `pairing_invites`: SELECT/INSERT own (`created_by = auth.uid()`);
    redemption only via RPC.
  - `profiles`: co-member SELECT policy, so partners can read each
    other's profile.
- Expiry and single-use are enforced by the RPCs, not the schema.
- Out: pairing RPCs (PRD-16), key generation and recovery write
  (PRD-17, PRD-22), UI (PRD-21).

## Decisions

- Co-member `profiles` SELECT policy added here (not PRD-16): this PRD
  introduces the linkage it needs. It uses a direct EXISTS on
  `relationships`, since `is_relationship_member` takes a relationship
  id, not a profile id.
- `on delete cascade` on member FKs: GDPR account delete cascades.
- PKs via `gen_random_uuid()`.

## Verification

- Migration applied via Supabase preview/prod (SQL-only).
- QA: non-member cannot SELECT/UPDATE a relationship; direct INSERT
  denied; duplicate pair hits the unique violation; self-pair rejected;
  others cannot see someone's invites.
