# PRD-12 — `profiles` table + auto-create trigger + RLS

## Goal

Create the `profiles` table (1:1 with `auth.users`), auto-populate it on
user creation, and lock it down with RLS.

## Scope

**In:**
- Migration `supabase/migrations/NNNN_profiles.sql` per `DESIGN.md`
  §13a:
  - `profiles`: `id` uuid PK FK→`auth.users.id`, `display_name` text
    null, `locale` text (`'en'|'pl'|'de'`), `theme` text default
    `'system'`, `created_at` timestamptz.
  - Trigger on `auth.users` insert → insert matching `profiles` row.
- RLS (`DESIGN.md` §13c): SELECT own row (relationship co-member
  visibility deferred until relationships exist, Phase 2); UPDATE own
  only; INSERT via trigger only.

**Out:**
- Reading/writing profile from the client (PRD-13 data layer).
- Co-member SELECT policy (needs `relationships`, Phase 2) — add then.
- Onboarding UI (PRD-14).

## Touched files / new files

- `supabase/migrations/NNNN_profiles.sql` — new.

## Data model impact

- New table `profiles`; trigger `on_auth_user_created`; RLS policies on
  `profiles`.

## UI behavior

None.

## Verification

1. Migration applies clean on a preview branch (Supabase check green).
2. Creating an anon user auto-creates a `profiles` row with same id.
3. RLS: a user can SELECT/UPDATE only their own row; cannot read
   another user's row.

**Unit tests (Dev):** N/A (SQL) — verified via preview branch.

**QA suite:**
- Adversarial (RLS): as user A, attempt to SELECT/UPDATE user B's
  profile → denied.
- `theme`/`locale` CHECK/default behavior correct.
- Deleting `auth.users` row cascades to `profiles`.

## Open questions

(none)

## Dev notes

**Migration:** `supabase/migrations/0001_profiles.sql`

**Choices:**
- `on delete cascade` on FK → auth.users — GDPR account delete cascades.
- `security definer set search_path = ''` on trigger fn — Supabase best
  practice to avoid search_path injection.
- No INSERT policy for profiles — rows created only via trigger. Direct
  inserts blocked by RLS (no INSERT policy = deny).
- Co-member SELECT policy deferred to Phase 2 (needs `relationships`
  table).

**Self-test:** migration is SQL-only; verified via Supabase preview
branch on merge.
