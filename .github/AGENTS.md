# .github/AGENTS.md

## Purpose

CI/CD: secret scan, checks, beta and production deploys.

## Ownership

Owns the GitHub workflows (one deploy workflow).

## Local Contracts

- Every run: gitleaks -> install (frozen lockfile) -> typecheck -> lint
  -> test (no `.env` needed).
- Push to `master` (and PRs, build only): beta build with name
  "Endeary beta" and deploy to the Cloudflare Worker via the beta
  deploy script. Without the Cloudflare token it builds and warns.
- Push to `release`: production build in the `production` environment
  with name "Endeary" -> GitHub Pages (`endeary.com`). Prod values use
  `PROD_*` names and the job fails if they are missing or equal beta.
- Both builds at base `/`; post-build adds SPA fallback, `robots.txt`
  disallow and the manifest name.
- Node 22 (pnpm 11 needs >= 22.13). Do not lower.

## Work Guidance

- No tokens or private values in workflow files. Public build values
  come from secrets (§16g). Owner setup: `docs/production-setup.md`.

## Verification

- PR runs green before merge. After a push, the target site serves `/`,
  `/privacy`, `/terms`, `/app`, and `/app/*` deep links reach the
  shell.

## Child DOX Index

- None.
