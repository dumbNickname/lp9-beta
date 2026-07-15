# Next session — resume here

> Short handoff for the orchestrator (chat session) picking up the
> couples gamification app. Read this first; it points you at the
> right detailed docs in the right order.

## Where we are

- Design phase **complete**. All decisions in `DESIGN.md` (SS1-17).
- **Phase 0 complete and deployed.** Static site on GitHub Pages.
- **Phase 1 complete and deployed.** Supabase client, anon auth,
  profiles table + trigger + RLS, data-access layer, onboarding form.
  Live at `https://dumbnickname.github.io/lp9-beta/app`.
- **Next: decompose Phase 2** (pairing + encryption foundation) into
  PRDs.
- Single GitHub repo: `dumbNickname/lp9-beta`. Git remote is `beta`.
- Single Supabase project, `eu-central-1` (Frankfurt), connected via
  GitHub Integration (production branch: `master`).
- GitHub Actions secrets `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  configured for CI builds.

## Open follow-ups (parked, not blocking)

- **Branch protection on `master`:** require PR + Supabase Preview
  check + gitleaks check + linear history. Not yet set.
- **Sign Supabase DPA** before public launch (Phase 8 / 10).
- **Pick the final app name** before Phase 9. Until then `APP_NAME`
  (code) + `lp9-beta` (repo/`BASE_PATH`) are placeholders.

## Read order on resume

1. **This file** — orientation.
2. **`PROGRESS.md`** — current PRD status table.
3. **`DESIGN.md`** — full source of truth.
4. The PRD you're about to execute, in `prds/PRD-NN-*.md`.
5. **`HANDOFF.md`** — strategic phase plan.

## Status snapshot

See `PROGRESS.md` for the authoritative table.

| Phase | Status |
|-------|--------|
| 0 (repo bootstrap) | `merged` |
| 1 (Supabase + auth) | `merged` (PRD-11..14) |
| 2 (pairing + encryption) | **next — needs PRD decomposition** |

## What to do next

**Decompose Phase 2** (pairing + encryption foundation) into PRDs, per
`HANDOFF.md` Phase 2 tasks 2.1-2.9 and `DESIGN.md` S13 (data model),
then execute one at a time.

## If anything is unclear

- Operational rules + learned gotchas live in `AGENTS.md` (root DOX
  rail) and child `AGENTS.md` files. Read the DOX chain for paths you
  touch.
- PRD ambiguity -> load `grill-me` and stop.
- Terse comms -> `caveman`.
