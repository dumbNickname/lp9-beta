# cloudflare/AGENTS.md

## Purpose

Beta host: a Cloudflare Worker that serves the static build on
`workers.dev` and runs a daily keep-alive cron for both Supabase
projects (PRD-57).

## Ownership

Owns the Worker config and script. The deploy script lives in
`scripts/`; the CI job in `.github/`.

## Local Contracts

- Assets are the build output; unknown paths fall back to the SPA shell.
- Cron reads one row-limited query per project with its publishable
  key. A permission error from Postgres still counts as reached.
  Unconfigured targets are skipped, never failing the run.
- Supabase URLs/keys reach the Worker as secrets synced by the deploy
  script; nothing is written into the config.
- Excluded from repo typecheck/lint (plain JS, Workers runtime).

## Work Guidance

- Keep the Worker free-tier only: no KV, D1 or paid features.

## Verification

- `wrangler dev` with the config serves `/`, `/app/`, deep links and
  `robots.txt`; `--test-scheduled` logs one keepalive line per target.

## Child DOX Index

- None.
