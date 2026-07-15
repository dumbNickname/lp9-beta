# Progress — Couples Gamification App

> Single source of truth for **what's being built and where each PRD
> stands.** Updated by the orchestrator (chat session) whenever a PRD
> transitions state. PRD files themselves live at stable paths
> (`prds/PRD-NN-slug.md`) and never move.

## How to read this file

- **Phase** — high-level grouping from `HANDOFF.md`. Phase 0 is repo
  bootstrap; phases 1–10 are user-visible feature work + launch.
- **Status:**
  - `todo` — PRD exists, not started.
  - `in-progress` — Dev agent is working on it.
  - `dev-done` — Dev agent reports the PRD's Goal is met and unit
    tests pass. Awaiting QA.
  - `qa-done` — QA agent's adversarial tests pass; findings (if any)
    addressed.
  - `merged` — landed on `master`, deployed to beta.
- **PRD** — file path. `—` means the PRD has not been written yet
  (placeholder row for a future phase).

## Process & tooling references

- `DESIGN.md` §16 — process, slicing, agents, secret hygiene
- `DESIGN.md` §17 — license & brand protection
- `.opencode/agent/dev.md` — Dev agent contract
- `.opencode/agent/qa.md`  — QA agent contract
- `scripts/install-toolchain.sh` — set up a fresh dev machine

## PRDs

### Phase 0 — Repo & infrastructure bootstrap

Goal: deployable empty SolidStart site on GitHub Pages with the right
toolchain. No app logic yet.

| #  | Title                                                 | PRD                                            | Status |
|----|-------------------------------------------------------|------------------------------------------------|--------|
| 00 | License file (AGPL-3.0)                               | `prds/PRD-00-license.md`                       | qa-done  |
| 01 | Trademark notice                                      | `prds/PRD-01-trademark.md`                     | qa-done  |
| 02 | README skeleton                                       | `prds/PRD-02-readme.md`                        | qa-done  |
| 03 | Progress tracker + `prds/` convention                 | `prds/PRD-03-progress-tracking.md`             | qa-done  |
| 04 | Dev subagent definition                               | `prds/PRD-04-dev-subagent.md`                  | qa-done  |
| 05 | QA subagent definition                                | `prds/PRD-05-qa-subagent.md`                   | qa-done  |
| 06 | `.gitignore` + `.env.example` + gitleaks pre-commit   | `prds/PRD-06-secret-hygiene.md`                | merged   |
| 07 | Supabase bootstrap (GitHub integration + first migration)  | `prds/PRD-07-supabase-bootstrap.md`            | merged   |
| 08 | SolidStart + Vinxi bootstrap                          | `prds/PRD-08-solidstart-bootstrap.md`          | merged   |
| 09 | GitHub Actions deploy workflow + 404 fallback         | `prds/PRD-09-deploy-workflow.md`               | merged   |
| 10 | Theme toggle + CSS custom properties                  | `prds/PRD-10-theme-toggle.md`                  | merged   |

### Phase 1 — Supabase + auth foundation

PRDs to be expanded when Phase 0 is `merged`. Source: `HANDOFF.md`
Phase 1 task list 1.1–1.9.

| #  | Title                                                 | PRD                                            | Status |
|----|-------------------------------------------------------|------------------------------------------------|--------|
| 11 | Supabase client + anonymous sign-in                   | `prds/PRD-11-supabase-client-anon-auth.md`     | in-progress |
| 12 | `profiles` table + trigger + RLS                      | `prds/PRD-12-profiles-table-rls.md`            | todo   |
| 13 | Data-access layer + reactive profile store            | `prds/PRD-13-data-access-layer.md`             | todo   |
| 14 | First-launch onboarding                               | `prds/PRD-14-onboarding.md`                    | todo   |

### Phase 2 — Pairing + encryption foundation

Source: `HANDOFF.md` Phase 2.

| #  | Title                                                 | PRD | Status |
|----|-------------------------------------------------------|-----|--------|
| —  | (Phase 2 PRDs not yet decomposed)                     | —   | todo   |

### Phase 3 — Core points loop (hearts) — first vertical slice

Source: `HANDOFF.md` Phase 3. From this phase onward each task becomes
its own end-to-end PRD per `DESIGN.md` §16a.

| #  | Title                                                 | PRD | Status |
|----|-------------------------------------------------------|-----|--------|
| —  | (Phase 3 PRDs not yet decomposed)                     | —   | todo   |

### Phase 4 — Wishlists + coupon approval

| #  | Title                                                 | PRD | Status |
|----|-------------------------------------------------------|-----|--------|
| —  | (Phase 4 PRDs not yet decomposed)                     | —   | todo   |

### Phase 5 — Coupon claim/escrow flow

| #  | Title                                                 | PRD | Status |
|----|-------------------------------------------------------|-----|--------|
| —  | (Phase 5 PRDs not yet decomposed)                     | —   | todo   |

### Phase 6 — Email notifications

| #  | Title                                                 | PRD | Status |
|----|-------------------------------------------------------|-----|--------|
| —  | (Phase 6 PRDs not yet decomposed)                     | —   | todo   |

### Phase 7 — i18n

| #  | Title                                                 | PRD | Status |
|----|-------------------------------------------------------|-----|--------|
| —  | (Phase 7 PRDs not yet decomposed)                     | —   | todo   |

### Phase 8 — GDPR + privacy + content pages

| #  | Title                                                 | PRD | Status |
|----|-------------------------------------------------------|-----|--------|
| —  | (Phase 8 PRDs not yet decomposed)                     | —   | todo   |

### Phase 9 — Homepage + SEO polish

Blocker: name must be locked in before this phase starts (§14i).

| #  | Title                                                 | PRD | Status |
|----|-------------------------------------------------------|-----|--------|
| —  | (Phase 9 PRDs not yet decomposed)                     | —   | todo   |

### Phase 10 — Pre-launch checklist

Includes the legal review noted in `DESIGN.md` §17d.

| #  | Title                                                 | PRD | Status |
|----|-------------------------------------------------------|-----|--------|
| —  | (Phase 10 PRDs not yet decomposed)                    | —   | todo   |

## Decomposition rule

A phase's `(not yet decomposed)` row is replaced with concrete PRD rows
**when the previous phase is `merged`**. This keeps PRDs from being
written against assumptions that earlier work will invalidate.

The orchestrator may decompose the next phase earlier if a PRD in the
current phase reveals it must change the shape of the next phase's
work — but only if; not preemptively.
