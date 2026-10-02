# PRD-07 — Supabase bootstrap (GitHub integration + first migration)

> Status: see `PROGRESS.md`.

## Goal

Wire the repo to the already-connected Supabase project through a
`supabase/` directory at repo root, prove the GitHub integration applies
migrations end-to-end with a no-op migration, and document the workflow
so every later schema PRD follows the same pattern.

## What shipped

- `supabase/` at repo root (working dir `.`, matching the dashboard's
  GitHub Integration setting): committed project config, a migrations
  folder, an empty seed file (seeds preview-branch DBs).
- First migration is a no-op comment; its only job is to prove the
  integration pipeline.
- Supabase README documents: the branch-driven workflow (`DESIGN.md`
  §16e/§16f: new migration -> branch -> PR -> Supabase preview branch ->
  merge -> prod applies it), schema changes only via migrations (never
  dashboard click-ops), project URL + anon key from dashboard -> API into
  local `.env`, no personal access token or DB password needed, region.
- Project region: `eu-central-1` (Frankfurt), confirmed by owner; meets
  the EU requirement in §12d.
- `.env.example` lists only public `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. Committed config contains no secrets
  (gitleaks clean).
- Out: real schema (Phase 1+), Edge Functions, anonymous sign-in toggle,
  local `supabase start` Docker stack (only if a contributor asks),
  branch-protection gate (PRD-09).

## Decisions

- **Q-07-1 (resolved):** region `eu-central-1` Frankfurt.
- **Q-07-2:** a broken migration could be merged until `master` requires
  the Supabase Preview check; closing it was handed to PRD-09.
- **Q-07-3:** owner supplies project URL and anon key for local `.env`
  before later client work; not needed for the pipeline test itself.

## Verification

- Config, no-op migration, seed and README checked; secret scan clean.
- Owner/live-pending at the time: end-to-end PR check (status check,
  preview branch, migration applied) and adversarial broken-migration PR
  that must fail the Supabase Preview check, then clean up orphan
  preview branches.

## Gotchas

- Supabase CLI ships a thin shim that forwards to a sibling binary;
  installing only the shim breaks `supabase init`. The installer
  installs both.
- Never `db push` / `link` locally; migrations reach prod via the
  GitHub integration.

## Later changes

- Workflow: solo-owner practice now commits straight to `master`
  (root AGENTS.md); branches + PRs, and with them the preview-branch
  gate, return once branch protection is on.
- Edge Functions were added later; they deploy only when declared in
  the Supabase config (see `supabase/AGENTS.md`).
