# supabase/AGENTS.md

## Purpose

Database source of truth: schema, migrations, and the branch-driven
workflow connecting this repo to the Supabase project.

## Ownership

- Owns `supabase/` (config, migrations, seed, this doc).
- `supabase/README.md` is the human-facing workflow guide; this file is
  the agent contract. Keep them consistent.

## Local Contracts

- **Schema changes only via `supabase/migrations/NNNN_slug.sql`.** Never
  click-ops in the dashboard (`DESIGN.md` §16e).
- **Scaffold** with `supabase migration new <slug>`; commit on a feature
  branch; the Supabase GitHub integration applies it to an auto-created
  preview branch on PR, then to production on merge to `master`.
- **Do NOT run `supabase db push` or `supabase link`** locally — the
  branch-driven flow owns all DB changes.
- **No PAT, no DB password** needed for the branch-driven flow. The only
  public client values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  live in local `.env`, never committed.
- **Region is `eu-central-1` (Frankfurt)** — EU requirement, do not move
  (`DESIGN.md` §12d).
- `config.toml` must contain no secrets; `seed.sql` populates preview
  branch DBs.

## Work Guidance

- Data model shape (tables, RLS, RPCs, indexes) is specified in
  `DESIGN.md` §13. Refine exact SQL when writing each migration.
- `relationship_id` is denormalized onto child tables for single-lookup
  RLS predicates (`DESIGN.md` §13f).

## Verification

- A migration is ready only when (a) the Supabase preview CI check is
  green on the PR, and (b) QA verified behavior on the preview env
  (`DESIGN.md` §16e). Both are live-infra checks (owner/QA), not local.

## Child DOX Index

- None.
