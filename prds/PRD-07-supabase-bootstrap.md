# PRD-07 — Supabase dev/prod projects + first empty migration

## Goal

Provision two Supabase projects (`dev` writable by the dev agent,
`prod` owner-only), wire local `supabase` CLI to `dev`, and verify the
migration plumbing works end-to-end with a no-op migration that simply
applies cleanly.

## Scope

**In:**
- Owner provisions both Supabase projects in **EU region** (Frankfurt
  or Ireland — `DESIGN.md` §12d), names them clearly (e.g.
  `<APP_NAME>-dev`, `<APP_NAME>-prod`).
- Owner shares with dev agent: dev project ref, anon key, **personal
  access token**, db password — all into local `.env`.
- `supabase/` directory initialized with `supabase init`:
  - `supabase/config.toml` (project config; commit).
  - `supabase/migrations/` directory.
  - First migration `supabase/migrations/0000_init.sql` that's a no-op
    (just a comment) — purely to verify the pipeline works.
- `supabase/README.md` explaining: how to run migrations against dev
  (`supabase db push`), how prod migrations get promoted (owner runs
  same command with prod env vars), the rule that **schema changes
  always go via migration files**, never the dashboard.
- `.env.example` updated if any new vars surfaced.

**Out:**
- Real schema (deferred to Phase 1+ PRDs).
- Supabase Edge Functions (deferred until needed).
- Anonymous sign-in toggle in dashboard (Phase 1).

## Touched files / new files

- `supabase/config.toml` — new.
- `supabase/migrations/0000_init.sql` — new (no-op).
- `supabase/README.md` — new.
- `.env.example` — possibly updated.

## Data model impact

- New: nothing meaningful (no-op migration).
- The point of the migration is to prove the pipeline works.

## UI behavior

None.

## Verification

1. `supabase --version` reports the pinned version (PRD-toolchain
   passed).
2. With `.env` populated for the dev project: `supabase db push`
   applies `0000_init.sql` to the dev project without error.
3. Re-running `supabase db push` is idempotent (no error, no changes).
4. `supabase/config.toml` is committed; `.env` is NOT committed.
5. `supabase/README.md` documents both dev push and prod promotion.

**Unit tests:** N/A.

**QA suite:**
- Adversarial: try to push a migration without `.env` set; CLI must
  fail loudly with a clear error.
- Adversarial: try to push to prod from this environment; should be
  impossible without owner's prod credentials. Verify there is no
  prod credential in the dev environment.
- Verify the dev project is in EU region (Frankfurt or Ireland) per
  §12d. Document the region in `supabase/README.md`.

## Open questions

- Naming of the two Supabase projects. Use placeholders `APP_NAME-dev`
  and `APP_NAME-prod` until §14 resolves; rename in dashboard later.
- Does the owner sign the Supabase DPA at provisioning time, or right
  before public launch? `DESIGN.md` §12d says before going live, so
  Phase 8/10. Not a Phase 0 blocker.
