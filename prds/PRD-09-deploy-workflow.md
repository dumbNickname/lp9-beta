# PRD-09 — GitHub Actions deploy workflow + 404 fallback

> Status: see `PROGRESS.md`.

## Goal

Single-repo deploy pipeline (`DESIGN.md` §16f): push to `master` deploys
the static build to GitHub Pages; a `404.html` fallback makes deep links
into `/app/*` work on Pages; branch-protection rules on `master` are
documented.

## What shipped

- Workflow on push and PR to `master` (legacy default branch name,
  intentional): gitleaks secret scan, frozen pnpm install, build with
  the sub-path base (`/lp9-beta/`, a workflow-level env), post-build
  404 step, Pages artifact upload, deploy via the official Pages action.
  Deploy runs only on push to `master`; PRs get scan + build only.
- 404 fallback: post-build copies the built `index.html` to `404.html`
  (same `<base href>`), so `/app/anything` loads the shell and the
  client router takes over.
- No secrets in CI: Supabase URL + anon key are public build-time values
  (§16g).
- README Deployment section: pipeline plus one-time owner setup.
- Out: custom domain (Phase 10).

## Decisions

- 404 via copy (option a) over prerendering every `/app/*` variant;
  simpler.
- Deploy on every push to `master`, not tags; tags are over-process for
  a side project.
- Intended branch protection: require PR, require Supabase Preview
  (§16e.1) and gitleaks checks, linear history (squash). Closes Q-07-2
  once enabled.

## Verification

- Local: sub-path build passes; `404.html` identical to `index.html`
  with the correct base href.
- Owner/live-pending at the time: Pages source set to GitHub Actions;
  green run; production serves the four routes; deep link hits the
  shell; direct push rejected; failing Supabase Preview blocks merge;
  fake secret fails CI; deploy log leaks nothing beyond public values.

## Gotchas

- If the repo is renamed, update the `BASE_PATH` env in the workflow.
- Static `public/` files land under the sub-path; use relative URLs.

## Later changes

- Workflow: solo-owner practice pushes straight to `master`; CI gates
  the deploy. Branch protection + PRs come later (root AGENTS.md), so
  the PR/required-check rules above are not active yet.
- CI/CD details now live in `.github/AGENTS.md`.
