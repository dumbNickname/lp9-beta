# PRD-57 — Production environment (endeary.com) + beta on a Worker

> Tiny PRD per `DESIGN.md` §16b. On ambiguity, STOP and load `grill-me`.

## Goal

Two environments from one repo: **beta** (every push to `master`) on a
Cloudflare Worker with the beta Supabase project, and **production**
(push to `release`) on GitHub Pages at `endeary.com` with a new,
separate Supabase project. Neither Supabase project pauses.

## Decisions (owner, 2026-10-18)

- D-57.1 One repo (`lp9-beta`, not renamed yet). Two Supabase projects
  in the same free account: existing one = beta, new one = prod (EU
  Frankfurt, §12d).
- D-57.2 Prod = this repo's GitHub Pages, custom apex `endeary.com`,
  `www` redirects to apex, HTTPS enforced. DNS stays at OVH (A/AAAA to
  GitHub Pages IPs, `www` CNAME to `dumbnickname.github.io`).
- D-57.3 Beta moves off GitHub Pages to a Cloudflare Worker with static
  assets on `workers.dev` (`<worker>.<account>.workers.dev`), same
  pattern as the owner's existing Worker apps. No custom beta domain.
- D-57.4 Ship to prod = fast-forward `release` to `master`. The prod
  Supabase GitHub integration uses `release` as its production branch,
  so schema and code ship together. No tags, no DB credentials in CI.
- D-57.5 Beta testers start fresh on the new origin (device keys are
  per origin). No data migration. After the custom domain is set,
  GitHub redirects the old `github.io/lp9-beta/` URL to `endeary.com`.
- D-57.6 Keep-alive: the beta Worker has a daily cron trigger that
  calls a tiny DB-touching endpoint on **both** projects. Free tier
  stays; Pro is not planned.
- D-57.7 Names per build: prod "Endeary", beta "Endeary beta". Set at
  build time; the page title, app bar and manifest follow it.
- D-57.8 Prod is quiet until launch (Phase 9): full app works, but
  `noindex` (meta + `robots.txt` disallow). Beta always `noindex`.
- D-57.9 Prod gets its own VAPID key pair and webhook secret; beta keys
  never reach prod.
- D-57.10 Prod build values live in a GitHub **environment**
  `production`, usable only from `release`. Beta values stay as repo
  secrets. Cloudflare API token + account id are repo secrets.
- D-57.11 Backups: none in this PRD. A weekly prod dump is a follow-up
  PRD before real users (needs a DB password secret).

## Scope

**In:**
- Build config: base path `/` for both targets (no sub-path any more);
  display name and indexing from build env (D-57.7, D-57.8), read at
  runtime-safe points (prerender has no `VITE_*` at module load).
- Worker `endeary-beta`: serves the build as static assets with the
  existing `404.html` SPA fallback, plus a daily cron (`scheduled`)
  that runs one row-limited query on each project with its publishable
  key and logs the result. URLs/keys are Worker secrets synced by the
  deploy script. Config in `cloudflare/`, excluded from app
  typecheck/lint like Edge Functions.
- On-demand beta deploy script (`pnpm deploy:beta`) reading exported
  vars, then `.env.beta`, then `.env`; CI uses the same script.
- Workflow: push to `master` -> checks + beta build + Worker deploy;
  push to `release` -> checks + prod build (environment `production`)
  + GitHub Pages deploy. PRs: checks + both builds, no deploy.
- `robots.txt` + meta `noindex` per D-57.8.
- Docs: owner guide `docs/production-setup.md` (steps below), DESIGN
  §16e/§16f amended (two projects, two environments), `.github`,
  `supabase` and root AGENTS.md updated, README deployment section.

**Out:**
- Backups (D-57.11), Pro plan, beta custom domain, repo rename,
  GDPR/legal/homepage (Phases 8-10), OVH mailbox, data migration.

## Owner setup

Step by step in `docs/production-setup.md` (Cloudflare, GitHub,
Supabase, push keys, OVH DNS, first release).

## Data model impact

- None. Prod gets all existing migrations via the integration on the
  first `release` push.

## Verification

1. Push to `master`: Worker URL serves `/`, `/privacy`, `/terms`,
   `/app`, and `/app/*` deep links reach the shell; title says
   "Endeary beta"; GitHub Pages not redeployed.
2. Push to `release`: `https://endeary.com` serves the same routes over
   HTTPS, title "Endeary"; `www.endeary.com` redirects to apex.
3. Bundles: beta bundle contains only the beta Supabase URL, prod only
   the prod URL (grep the built JS).
4. Both sites send `noindex` (meta) and `robots.txt` disallows all.
5. Cron: Worker logs show a daily 200 from both projects (trigger once
   by hand via `wrangler` / dashboard to check).
6. Live E2E on each site: two anonymous users pair, give a heart,
   partner reads the note.
7. Push on prod: Settings -> Turn on, Send test -> `sent:1`.

**Unit tests (Dev):** display-name and noindex helpers pick values per
env and fall back safely when env is empty (prerender).

**QA suite:** nothing in prod points at beta (URLs, keys, manifest
`start_url`/`scope`, service worker scope).

## Open questions

- None at write time.

---

## Dev notes

- Worker `endeary-beta` in `cloudflare/` (assets with SPA fallback +
  daily cron at 04:17 UTC). Anon has no table rights, so the ping gets
  Postgres error 42501 (HTTP 401): that proves the database was hit and
  is logged as ok. Verified with `wrangler dev --test-scheduled`
  against the beta project.
- `scripts/deploy-beta.sh` (`pnpm deploy:beta`): build at `/` with name
  "Endeary beta", post-build, `wrangler deploy`, `wrangler secret bulk`
  for keep-alive targets. Wrangler pinned to a 2-week-old release
  (pnpm minimum release age); `workerd` build script not needed.
- CI: jobs `checks`, `beta` (master + PR build-only; skips deploy with a
  warning while the Cloudflare token is missing), `production-build`
  (environment `production`, `PROD_*` secrets, fails if missing or equal
  to beta) and `production-deploy` (Pages, `release` only).
- `APP_NAME` reads `VITE_APP_NAME` (fallback `lp9`); post-build writes
  the manifest name, `robots.txt` disallow; every page has meta
  `noindex, nofollow`.
- Local checks: build with "Endeary beta" -> titles, h1, manifest,
  robots correct; `wrangler dev` serves `/`, `/app/` (307 from `/app`),
  deep links and unknown paths reach the shell. Typecheck, lint, 515
  tests pass.
- Not verifiable without the owner's accounts: real Worker deploy,
  prod project, DNS, Pages custom domain (Verification 1-7 live).
- Risk to watch: the beta project's integration may create a preview
  branch for `release` if automatic branching is on; and Supabase must
  accept the same repo on a second project. Setup guide says to report
  either.
