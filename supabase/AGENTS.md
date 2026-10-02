# supabase/AGENTS.md

## Purpose

Database source of truth: schema, migrations, server functions, and
the branch-driven link between this repo and the Supabase project.

## Ownership

- Owns config, migrations, seed, Edge Functions and this doc. The
  folder README is the human workflow guide; keep both consistent.

## Local Contracts

- Schema changes only as numbered migrations; never click-ops (§16e).
- The Supabase GitHub integration applies migrations on push to
  `master` (or to a preview branch on PR). Never `db push`/`link`
  locally; no PAT or DB password needed.
- RPCs: security definer with an empty search path. Helpers: revoke
  execute from public/anon/authenticated (Postgres grants PUBLIC by
  default). No write RLS policies; writes go through RPCs.
- Verify live after a migration with a throwaway two-client smoke
  script kept outside the repo.
- Region is EU Frankfurt; do not move (§12d).
- Config holds no secrets; seed only feeds preview databases.
- Edge Functions deploy only when declared in config; their secrets
  live in the dashboard. They are excluded from repo typecheck/lint.
- Push notifications: DB triggers call a function via pg_net with URL
  and secret from Vault, and must never fail the user's action. Owner
  setup lives in `docs/`.

## Work Guidance

- Data model shape (tables, RLS, RPCs, indexes) is in `DESIGN.md` §13.
- The pair id is denormalised onto child tables for one-lookup RLS
  (§13f).

## Verification

- A migration is ready when the preview check is green and behaviour is
  verified on the preview or live environment.

## Child DOX Index

- None.
