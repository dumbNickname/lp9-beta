# .github/AGENTS.md

## Purpose

CI/CD: secret scan, build and GitHub Pages deploy.

## Ownership

Owns the GitHub workflows (currently one deploy workflow).

## Local Contracts

- Runs on push and PR to `master`: gitleaks scan → install (frozen
  lockfile) → typecheck → lint → test (no `.env` needed) → build with
  the sub-path → SPA 404 fallback → Pages artifact. Deploy runs on push
  to `master` only.
- Node 22 (pnpm 11 needs ≥ 22.13). Do not lower.
- The sub-path env must match the Pages project path; change it if the
  repo is renamed (§16f).

## Work Guidance

- No tokens or private values in workflow files. Public build values
  (Supabase URL, publishable key, VAPID public key) come from Actions
  secrets (§16g).

## Verification

- PR runs green before merge. After a push, the Pages site serves `/`,
  `/privacy`, `/terms`, `/app`, and `/app/*` deep links reach the
  shell.

## One-time owner setup

- Pages source = GitHub Actions.
- Branch protection on `master` (PR required, Supabase preview +
  gitleaks checks, linear history).
- Actions secrets: Supabase URL, publishable key, VAPID public key
  (without it, Settings reports notifications as not set up).

## Child DOX Index

- None.
