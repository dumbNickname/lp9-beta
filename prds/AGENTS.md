# prds/AGENTS.md

## Purpose

Tiny PRDs — one user-visible behavior or infra capability per file. Each
is the executable unit a Dev agent implements and a QA agent verifies.

## Ownership

Owns `prds/`. `prds/README.md` documents the authoring convention and
`prds/PRD-template.md` is the shape; this file is the agent contract.

## Local Contracts

- **Naming:** `PRD-NN-short-slug.md`, numbered globally (not per phase)
  so `ls` shows execution order.
- **Status lives only in `PROGRESS.md`** (repo root), not in PRD files.
  PRD files never move; their status row changes.
  Flow: `todo → in-progress → dev-done → qa-done → merged`.
- **Required sections:** Goal, Scope (in/out), Touched files / new
  files, Data model impact, UI behavior, Verification, Open questions.
- **After execution:** Dev appends `## Dev notes` (self-test results,
  choices the PRD left open, gotchas for QA); QA appends `## QA
  findings`.
- **Ambiguity rule:** if a PRD does not unambiguously cover something,
  stop and load `grill-me` — do not guess (`DESIGN.md` §16b).
- **Decomposition rule:** future-phase PRDs are written only when the
  previous phase is `merged`.

## Work Guidance

- Phases 0–2 are horizontal foundation; from Phase 3 each PRD is a
  vertical slice (migration → RLS → RPC → data layer → UI → tests)
  (`DESIGN.md` §16a).

## Verification

- Verification steps in each PRD are the QA pass/fail contract.

## Child DOX Index

- None.
