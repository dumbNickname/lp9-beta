# PRD-09 — GitHub Actions deploy workflow + 404 fallback

## Goal

Two-remote deploy pipeline: pushing to `beta` deploys to the beta GH
Pages repo; pushing to `origin` deploys to the prod GH Pages repo.
Plus the `404.html` fallback so deep-links into `/app/*` work on GH
Pages.

## Scope

**In:**
- `.github/workflows/deploy.yml` ported from
  `~/own/m-tynki/.github/workflows/deploy.yml` and adjusted:
  - Trigger on push to `master` of whichever remote it lives in.
    (Repo uses the legacy `master` default branch; intentional, not
    a typo for `main`.)
  - `pnpm install --frozen-lockfile`.
  - `pnpm build` with `BASE_PATH` set from a workflow env (different
    per repo).
  - Run gitleaks against the diff as a CI safety net (mirrors PRD-06
    pre-commit).
  - Upload the build to `gh-pages` branch / Pages artifact.
- `404.html` fallback handling for `/app/*` deep-links per
  `DESIGN.md` §11b. Implementation choice (decide at execution time):
  - (a) Copy `dist/index.html` to `dist/404.html` post-build, OR
  - (b) Configure `app.config.ts` prerender to emit the app shell
    for every `/app/*` route variation.
  - Pick (a) for MVP; simpler.
- `scripts/post-build.sh` if needed for the 404 copy step.
- README updated with: how to set up the two GitHub repos, how the
  remotes work (`beta` = default push), required GH Actions secrets
  (Pages deploy token, etc.).

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

1. After committing this PRD's files and pushing to `beta`, the
   workflow runs green.
2. The beta URL loads `/`, `/privacy`, `/terms`, `/app`.
3. Deep-link to `/app/foo/bar` loads the app shell (no GH Pages 404
   page).
4. Workflow fails the build if gitleaks finds a secret pattern in
   the diff.
5. Pushing to `origin` (after owner sets up the prod repo) deploys
   the same artifact to the prod URL.

**Unit tests:** N/A (CI config).

**QA suite:**
- Adversarial: introduce a fake secret in a commit; CI must fail
  before publishing the build.
- Verify `BASE_PATH` differs between beta and prod builds and asset
  URLs reflect that (so prod assets aren't accidentally fetched from
  the beta path).
- Verify nothing in the deploy log echoes the GH token or any
  Supabase service-role key (it shouldn't even be present).

## Open questions

- Owner needs to create both GitHub repos and configure GH Pages
  source + secrets. Document in README; PRD's CI work assumes
  repos exist.
- Whether to deploy on every push or only on tags. MVP: every push to
  master; tags are over-process for a side project.
