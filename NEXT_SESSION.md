# Next session — resume here

> Short handoff for the orchestrator (chat session) picking up the
> couples gamification app. Read this first; it points you at the
> right detailed docs in the right order.

## Where we are

- Design phase **complete**. All decisions in `DESIGN.md` (§§1–17).
- Process & tooling decided in `DESIGN.md` §16; license & brand in §17.
- Phase 0 implementation in flight. Status table is `PROGRESS.md`.
- Single GitHub repo: `dumbNickname/lp9-beta`
  (`lp9` is a placeholder name, not final — see `DESIGN.md` §14i).
- Single Supabase project, connected to that repo via Supabase's
  GitHub Integration. Region: `eu-central-1` (Frankfurt). Working
  directory: `.`. Branching auto-creates preview environments per
  git branch. See `DESIGN.md` §16e for full model.

## Read order on resume

1. **This file** — orientation.
2. **`PROGRESS.md`** — current PRD status table.
3. **`DESIGN.md`** — full source of truth. Especially §16, §17 for
   process; §12d for region; §14i for naming status; §16e/§16f for
   the Supabase + git model.
4. The PRD you're about to execute, in `prds/PRD-NN-*.md`.
5. **`HANDOFF.md`** — strategic phase plan. Note the banner at the
   top: where it disagrees with `DESIGN.md` §16, `DESIGN.md` wins.

## Status snapshot (as of 2026-06-01)

| PRD | Title | Status |
|----|-------|--------|
| 00 | License (AGPL-3.0) | `qa-done` ✓ |
| 01 | Trademark notice | `qa-done` ✓ |
| 02 | README skeleton | `qa-done` ✓ |
| 03 | Progress tracker + prds/ convention | `qa-done` ✓ |
| 04 | Dev subagent | `qa-done` ✓ (smoke-tested via PRD-02) |
| 05 | QA subagent | `qa-done` ✓ (smoke-tested via PRD-02) |
| **06** | **`.gitignore` + `.env.example` + gitleaks pre-commit** | **next up** |
| 07 | Supabase bootstrap (GitHub integration) | blocked on PRD-06 |
| 08 | SolidStart + Vinxi bootstrap | needs PRD-07 done |
| 09 | GitHub Actions deploy workflow + 404 fallback | needs PRD-08 done |
| 10 | Theme toggle + CSS custom properties | needs PRD-08 done |

## What to do, in order

### 1. Pick up where execution stopped: **PRD-06**

PRD-06 lands `.gitignore`, `.env.example`, and the gitleaks
pre-commit hook. **Must land before any `.env` exists** so a real
`.env` is automatically excluded from git the moment you create it.

Invoke the **Dev subagent** with `prds/PRD-06-secret-hygiene.md` per
the orchestrator pattern used in the previous session. The subagent
definitions are at `.opencode/agent/dev.md` and `.opencode/agent/qa.md`;
they self-document required reads, allowed/forbidden actions, and
the execution loop.

After PRD-06 reaches `qa-done`:

### 2. Collect Supabase client values from owner (PRD-07 prerequisite)

Owner needs to share these from the Supabase dashboard:

- **Project URL** (Settings → API → Project URL,
  `https://<ref>.supabase.co`)
- **anon/public key** (Settings → API → Project API keys →
  `anon public`)

Both are public-by-design (RLS-protected; ship in browser bundle).
But per §16g hygiene, they go into a local `.env` file at repo root,
not into git. Owner should paste them into `.env` directly; do not
ask owner to paste them into chat.

**No personal access token, no DB password is needed** for the
branch-driven flow (per §16e). Don't ask for them.

### 3. Execute PRD-07: Supabase bootstrap

Invoke Dev subagent with `prds/PRD-07-supabase-bootstrap.md`. Notable
verification steps:

- The PRD includes a **real end-to-end pipeline test**: push a
  throwaway feature branch, confirm Supabase auto-creates a preview
  branch and applies the no-op migration. This proves the GitHub
  integration is wired correctly.
- The PRD's adversarial QA test pushes a deliberately broken
  migration on a throwaway branch and confirms the Supabase Preview
  CI check fails on the PR. Critical: **clean up the broken branch +
  any orphan preview environments after testing.**

### 4. Continue with PRDs 08, 09, 10 in order

PRD-08 (SolidStart bootstrap) → PRD-09 (deploy workflow + branch
protection) → PRD-10 (theme toggle).

After PRD-09 lands, branch protection on `master` requires PRs +
Supabase Preview check + gitleaks check. From that point on, no
direct push to `master`.

## Owner action items still open

These are owner tasks (not Dev/QA agent tasks):

- **Provide Supabase project URL + anon key** (when prompted, per
  step 2 above).
- **Configure GitHub Pages** (Settings → Pages → Source: GitHub
  Actions) when PRD-09 is being executed. The Dev agent will guide.
- **Configure branch protection** on `master` after PRD-09 lands:
  require PR, require Supabase Preview check, require gitleaks
  check, linear history (squash merges). Documented in PRD-09.
- **Sign Supabase DPA** before public launch — Phase 8 / Phase 10,
  not a near-term blocker.
- **Pick the final app name** before Phase 9 (homepage). Until then,
  `APP_NAME` placeholder is in code; repo name `lp9-beta` is also a
  placeholder.

## Subagent invocation pattern (reminder)

The previous session used the `task` tool with `subagent_type: general`
to invoke each subagent, with a prompt that:

1. Tells the subagent to read its own definition file
   (`.opencode/agent/dev.md` or `qa.md`) first.
2. Names the exactly-one PRD to execute.
3. Restates the hard constraints (no scope creep, no commits, no
   prod-touching commands).

This worked cleanly on PRD-02. Replicate the pattern.

## Gotchas to remember

- **Don't push to `master` directly.** Once PRD-09 lands, branch
  protection will block this; until then, it's a discipline thing.
- **Don't run `supabase db push`** from local. The branch-driven
  flow handles all DB changes via the GitHub integration.
- **Don't commit anything matching a real-secret pattern.** Once
  PRD-06 lands, gitleaks will block at commit time. Until then, be
  careful — the only real risk in the next ~15 min is creating a
  `.env` and accidentally `git add -A`'ing it. Solution: land PRD-06
  first, before creating `.env`.
- **`HANDOFF.md` is a strategic doc, not the source of truth.**
  `DESIGN.md` §16 supersedes any conflicting wording in HANDOFF.

## If anything is unclear

- For ambiguity in a PRD: load the `grill-me` skill and stop.
- For ambiguity in the design itself: ask the owner before changing
  `DESIGN.md`. Decisions get written back to `DESIGN.md` per the
  meta-rule (see `HANDOFF.md` "Meta-rule for future sessions").
- For the opencode subagent / config mechanics: load
  `customize-opencode` skill.
- For careful code work: load `pragmatic` skill.
