# PRD-02 — README skeleton

## Goal

A minimal, honest `README.md` at repo root that orients a fresh visitor
(or future Dev agent) in <60 seconds: what this project is, license,
how to set up, where to look next.

## Scope

**In:**
- One-paragraph product description (placeholder `APP_NAME`).
- License + trademark stance, prominently near the top.
- "Status" line: pre-MVP, design phase, no public product yet.
- Pointer to `DESIGN.md` (decisions), `PROGRESS.md` (what's being
  built), `HANDOFF.md` (the phased plan), `prds/` (in-flight tasks).
- Local setup section:
  - Prerequisites: node 20+, pnpm 9+, git 2.30+, curl, tar.
  - `bash scripts/install-toolchain.sh` to install the rest.
  - `bash scripts/verify-toolchain.sh` to check.
- Link to a `CONTRIBUTING.md` (deferred — note as TODO).

**Out:**
- Screenshots, marketing copy, demo links — none yet.
- Detailed architecture deep-dive — that's `DESIGN.md`'s job.
- Badges (CI, coverage) — deferred until CI exists.

## Touched files / new files

- `README.md` — new.

## Data model impact

None.

## UI behavior

None.

## Verification

1. `README.md` exists at repo root.
2. License section names AGPL-3.0-or-later and links to `LICENSE`.
3. Trademark section links to `TRADEMARK.md`.
4. Setup section's commands match what's in `scripts/`.
5. Following the README from a fresh clone produces a working dev
   environment (manual check).

**Unit tests:** none (markdown content).

**QA suite:**
- Markdown lint clean (no broken internal links).
- Every file the README references actually exists.
- Setup commands copy-pasted into a fresh shell complete without error
  (run by a human, since this needs a real fresh machine).

## Open questions

- Does the owner want their name / handle in the README author/credits
  section? Unknown until name+brand resolves; defer to TODO.
