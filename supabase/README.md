# Supabase — database workflow

This directory is the source of truth for the project's database schema.
Two Supabase projects read it through Supabase's **GitHub Integration**
(working directory `.`): **beta** follows `master` (previews on PRs),
**production** follows `release`. See `DESIGN.md` §16e and §16f and
`docs/production-setup.md`.

## Region

Both Supabase projects are in **`eu-central-1` (Frankfurt)** —
meets the EU-region requirement in `DESIGN.md` §12d.

## The one rule

**Schema changes always go through migration files in
`supabase/migrations/`. Never make schema changes via click-ops in the
Supabase dashboard.** Click-ops changes drift from the repo and are lost
on the next migration.

## Branch-driven workflow

Migrations are applied by Supabase's CI runners, authenticated through
the GitHub integration — **not** from your local machine.

1. Create a feature branch: `git checkout -b feat/PRD-NN-slug`.
2. Scaffold a migration: `supabase migration new <slug>`. This creates
   `supabase/migrations/<timestamp>_<slug>.sql`.
3. Edit the SQL, commit, push the branch. A new table needs its
   Data API grants in the same migration (Supabase no longer adds them;
   see `AGENTS.md`), or the app gets "permission denied".
4. Open a PR. Within ~2 minutes Supabase auto-creates an **ephemeral
   preview branch** — an isolated environment with its own DB, its own
   migration history, and no production data — and applies the new
   migrations to it. A status check appears on the PR.
5. QA verifies the behavior on the preview environment.
6. Merge to `master`. Supabase applies the new migrations to the
   **beta** database; they reach **production** when `release` is
   fast-forwarded to `master`.
7. Delete the feature branch; the preview environment is torn down.

`supabase/seed.sql` populates preview-branch databases (per Supabase
docs). It is currently empty; add seed data here when a PRD needs it on
previews.

## Credentials

Two public-by-design values are needed by the browser client:

- **Project URL** — Supabase dashboard → Settings → API → Project URL
  (`https://<ref>.supabase.co`).
- **anon/public key** — dashboard → Settings → API → Project API keys →
  `anon public`.

Both are RLS-protected and ship in the browser bundle. They still live
in a local `.env` (never committed) per the hygiene rules in
`DESIGN.md` §16g — see `.env.example` for the variable names
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

**No personal access token and no DB password are needed** for the
branch-driven flow. The local `supabase` CLI is used only for
scaffolding migrations (`supabase migration new`), formatting, and
optional local testing — none of which require those secrets.

## Local CLI

The `supabase` CLI is installed by `scripts/install-toolchain.sh`
(pinned version). You do not need to run `supabase db push` or
`supabase link` for the branch-driven flow; the GitHub integration
handles all DB changes.
