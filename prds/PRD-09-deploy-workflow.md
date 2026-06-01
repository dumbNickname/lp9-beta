# PRD-09 — GitHub Actions deploy workflow + 404 fallback

## Goal

Single-repo deploy pipeline (per the branching model in `DESIGN.md`
§16f): push to `master` deploys to GitHub Pages; PR previews from
feature branches optionally deploy to a per-PR URL. Plus the
`404.html` fallback so deep-links into `/app/*` work on GH Pages.
Plus branch-protection rules on `master`.

## Scope

**In:**
- `.github/workflows/deploy.yml` — a standard GitHub Pages
  deployment workflow for a static SolidStart build:
  - Trigger on push to `master`. (Repo uses the legacy `master`
    default branch; intentional, not a typo for `main`.)
  - `pnpm install --frozen-lockfile`.
  - `pnpm build` with `BASE_PATH` set from a workflow env.
  - Run gitleaks against the diff as a CI safety net (mirrors PRD-06
    pre-commit).
  - Deploy to GitHub Pages via the official `actions/deploy-pages`
    action.
- Branch-protection rules on `master` (configured via owner in the
  GitHub dashboard, documented here):
  - Require PR (no direct pushes).
  - Require **Supabase Preview** check to pass (§16e.1).
  - Require gitleaks CI check to pass.
  - Linear history (squash merges).
- `404.html` fallback handling for `/app/*` deep-links per
  `DESIGN.md` §11b. Implementation choice (decide at execution time):
  - (a) Copy `dist/index.html` to `dist/404.html` post-build, OR
  - (b) Configure `app.config.ts` prerender to emit the app shell
    for every `/app/*` route variation.
  - Pick (a) for MVP; simpler.
- `scripts/post-build.sh` if needed for the 404 copy step.
- README updated with: required GH Actions secrets, GitHub Pages
  configuration steps, and branch-protection rules on `master`
  (require PR, require Supabase Preview check per §16e.1, require
  gitleaks CI check, linear history / squash merges).

**Out:**
- Custom domain (Phase 10).
- Anything that requires Supabase secrets in CI (this is a static
  build; Supabase URL + anon key are baked at build time via env vars
  and are safe-to-publish per `DESIGN.md` §16g).

## Touched files / new files

- `.github/workflows/deploy.yml` — new.
- `scripts/post-build.sh` — new (only if used).
- `README.md` — updated.

## Data model impact

None.

## UI behavior

- Deep-linking to `https://<beta-host>/coupons-beta/app/anything`
  loads the app shell (404 fallback hits, client routing takes over).

## Verification

1. After committing this PRD's files and pushing a PR branch, the
   workflow runs green on the PR.
2. After merging to `master`, the production GH Pages URL loads
   `/`, `/privacy`, `/terms`, `/app`.
3. Deep-link to `/app/foo/bar` loads the app shell (no GH Pages 404
   page).
4. Workflow fails the build if gitleaks finds a secret pattern in
   the diff.
5. Direct push to `master` is rejected (branch protection works).
6. A PR with a failing Supabase Preview check cannot be merged
   (required check works).

**Unit tests:** N/A (CI config).

**QA suite:**
- Adversarial: introduce a fake secret in a commit on a feature
  branch; PR's CI must fail before deploy.
- Verify `BASE_PATH` produces correct asset URLs for the deploy
  target (no `/lp9-beta` paths in absolute production asset URLs
  if the repo is later renamed; this becomes a real concern at
  rename time).
- Verify nothing in the deploy log echoes the GH token or any
  Supabase value beyond the public anon key + project URL.

## Open questions

- Owner needs to configure GitHub Pages source (Settings → Pages →
  Source: GitHub Actions) and the branch-protection rules listed in
  Scope-In. PRD's CI work assumes these exist; document in README.
- Whether to deploy on every push or only on tags. MVP: every push to
  master; tags are over-process for a side project.
