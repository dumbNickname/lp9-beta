# PRD-12 — `profiles` table + auto-create trigger + RLS

> Status: see `PROGRESS.md`.

## Goal

Create the `profiles` table (1:1 with `auth.users`), auto-populate it on
user creation, and lock it down with RLS.

## What shipped

- `profiles` (`DESIGN.md` §13a): `id` uuid PK FK -> `auth.users.id`,
  `display_name` text null, `locale` (`en|pl|de`), `theme` default
  `system`, `created_at`.
- Trigger `on_auth_user_created`: inserting an `auth.users` row inserts
  the matching `profiles` row.
- RLS (§13c): SELECT own row; UPDATE own row only; no INSERT policy, so
  rows are created only by the trigger and direct inserts are denied.
- Out: client read/write (PRD-13), onboarding UI (PRD-14), co-member
  SELECT policy (needs `relationships`; added in PRD-15).

## Decisions

- `on delete cascade` on the FK to `auth.users`: GDPR account delete
  cascades to the profile.
- Trigger function is `security definer` with `search_path = ''`
  (avoids search_path injection).
- No INSERT policy: absence of a policy is deny.

## Verification

- Migration applied via Supabase preview/prod (SQL-only, no unit tests).
- QA: user A cannot SELECT/UPDATE user B's profile; `theme`/`locale`
  checks and defaults hold; deleting the auth user cascades.

## Later changes

- Co-member SELECT policy on `profiles` added in PRD-15.
