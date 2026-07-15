# .github/AGENTS.md

## Purpose

CI/CD. GitHub Actions workflows for build, secret-scan, and GitHub Pages
deploy.

## Ownership

Owns `.github/`. Currently one workflow: `workflows/deploy.yml`.

## Local Contracts

- **`deploy.yml`** runs on push and PR to `master`, jobs in order:
  1. `gitleaks` — CI secret scan (mirrors the pre-commit hook),
     `GITLEAKS_CONFIG=.gitleaks.toml`.
  2. `build` — `pnpm install --frozen-lockfile` → `pnpm build` (with
     `BASE_PATH` env) → `scripts/post-build.sh` (SPA 404 fallback) →
     upload-pages-artifact.
  3. `deploy` — `actions/deploy-pages`, **push-to-master only** (skipped
     on PRs so PRs validate without publishing).
- **Node 22** in `setup-node` — pnpm 11 requires ≥22.13, or the runner
  dies on the `node:sqlite` builtin. Do not lower it.
- **`BASE_PATH` env** (`/lp9-beta/`) must match the GH Pages project
  sub-path; update it here if the repo is renamed (`DESIGN.md` §16f).

## Work Guidance

- Keep GH tokens and Supabase values out of workflow YAML; the anon key
  + project URL are baked at build time and are public-safe, everything
  else uses GitHub Actions secrets (`DESIGN.md` §16g).

## Verification

- A PR run must go green (gitleaks + build) before merge. On push to
  `master`, the deploy job must publish and the Pages URL must serve
  `/`, `/privacy`, `/terms`, `/app`, with `/app/*` deep-links hitting
  the shell.

## One-time owner setup (dashboard)

- Pages source = GitHub Actions.
- Branch protection on `master`: require PR, require Supabase Preview +
  gitleaks checks, linear history.
- **Repository secrets** (Settings → Secrets → Actions):
  - `VITE_SUPABASE_URL` — project URL (public-safe, needed at build time
    for prerender).
  - `VITE_SUPABASE_ANON_KEY` — publishable/anon key (public-safe, needed
    at build time for prerender).

## Child DOX Index

- None.
