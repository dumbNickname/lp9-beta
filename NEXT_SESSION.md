# Next session — resume here

> Short handoff for the orchestrator (chat session) picking up the
> couples gamification app. Read this first; it points you at the
> right detailed docs in the right order.

## Where we are

- Design phase **complete**. All decisions in `DESIGN.md` (§§1–17).
- Process & tooling decided in `DESIGN.md` §16; license & brand in §17.
- **Phase 0 complete and deployed.** Site live at
  `https://dumbnickname.github.io/lp9-beta/` (renders `/`, `/privacy`,
  `/terms`, `/app`, theme toggle, no-flash). Status table is
  `PROGRESS.md`.
- **Next: decompose Phase 1** (Supabase + auth foundation) into PRDs.
- Single GitHub repo: `dumbNickname/lp9-beta`
  (`lp9` is a placeholder name, not final — see `DESIGN.md` §14i).
- Single Supabase project, connected to that repo via Supabase's
  GitHub Integration. Region: `eu-central-1` (Frankfurt). Working
  directory: `.`. Branching auto-creates preview environments per
  git branch. See `DESIGN.md` §16e for full model.
- **Free-tier Supabase pauses after ~1 week idle** (`DESIGN.md` §2). If
  things fail, check the project isn't paused in the dashboard first.

## Open follow-ups (parked, not blocking)

- **Verify Supabase preview pipeline (PRD-07):** push a throwaway branch
  + PR, confirm a preview branch appears in the dashboard and a
  `Supabase` status check posts on the PR. Integration looks connected;
  end-to-end preview not yet confirmed.
- **QA adversarial (PRD-07):** push a deliberately broken migration on a
  throwaway branch, confirm the Supabase Preview check FAILS, then clean
  up the branch + orphan preview env.
- **Branch protection on `master` (PRD-09):** require PR + Supabase
  Preview check + gitleaks check + linear history. Not yet set; until
  then, discipline-only (no direct pushes to `master`).
- **Supabase client creds for Phase 1:** put `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` into local `.env` (public-safe, still not
  committed). Needed once the browser client is added in Phase 1 — the
  git integration handles migrations only, not runtime client auth.

## Read order on resume

1. **This file** — orientation.
2. **`PROGRESS.md`** — current PRD status table.
3. **`DESIGN.md`** — full source of truth. Especially §16, §17 for
   process; §12d for region; §14i for naming status; §16e/§16f for
   the Supabase + git model.
4. The PRD you're about to execute, in `prds/PRD-NN-*.md`.
5. **`HANDOFF.md`** — strategic phase plan. Note the banner at the
   top: where it disagrees with `DESIGN.md` §16, `DESIGN.md` wins.

## Status snapshot

Phase 0 is fully merged and deployed. See `PROGRESS.md` for the
authoritative table.

| PRD | Title | Status |
|----|-------|--------|
| 00–05 | License, trademark, README, tracker, Dev/QA subagents | `qa-done` ✓ |
| 06 | `.gitignore` + `.env.example` + gitleaks pre-commit | `merged` ✓ |
| 07 | Supabase bootstrap (GitHub integration) | `merged` ✓ (preview pipeline unverified — see follow-ups) |
| 08 | SolidStart + Vinxi bootstrap | `merged` ✓ |
| 09 | GitHub Actions deploy + 404 fallback | `merged` ✓ (branch protection not yet set) |
| 10 | Theme toggle + CSS custom properties | `merged` ✓ |

## What to do next

**Decompose Phase 1** (Supabase + auth foundation) into PRDs, per
`HANDOFF.md` Phase 1 tasks 1.1–1.9 and `DESIGN.md` §13 (data model),
then execute one at a time on `feat/PRD-NN-slug` branches.

## Owner action items still open

- **Configure branch protection** on `master`: require PR + Supabase
  Preview check + gitleaks check + linear history (documented in
  PRD-09 / `.github/AGENTS.md`). Until then, do not push to `master`
  directly — discipline only.
- **Provide Supabase URL + anon key** into local `.env` when Phase 1
  starts (public-safe, still not committed).
- **Sign Supabase DPA** before public launch (Phase 8 / 10).
- **Pick the final app name** before Phase 9. Until then `APP_NAME`
  (code) + `lp9-beta` (repo/`BASE_PATH`) are placeholders.

## If anything is unclear

- Operational rules + learned gotchas now live in `AGENTS.md` (root DOX
  rail) and the child `AGENTS.md` files. Read the DOX chain for the
  paths you touch.
- PRD ambiguity → load `grill-me` and stop. Design ambiguity → ask the
  owner, then write the decision back to `DESIGN.md` (meta-rule).
- Careful code work → load `pragmatic`. Terse comms → `caveman`.
