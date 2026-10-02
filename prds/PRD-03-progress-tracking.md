# PRD-03 — Progress tracker + `prds/` convention

> Status: see `PROGRESS.md`.

## Goal

Lock in how work is tracked: `PROGRESS.md` at root as the single status
table, `prds/PRD-NN-slug.md` as stable PRD paths, `prds/PRD-template.md`
as the canonical PRD shape.

## What shipped

- `PROGRESS.md` in the `DESIGN.md` §16d format; status lives only there,
  never in PRD files. Flow: `todo -> in-progress -> dev-done -> qa-done ->
  merged`.
- `prds/PRD-template.md` as the contract for every PRD.
- `prds/README.md`: global numbering, status flow, how PRDs relate to
  `PROGRESS.md`.
- Out: decomposing future phases (done lazily, per the decomposition
  rule); tooling for status transitions (manual edits are fine).

## Decisions

- Convention is owner-confirmed; PRD files never move, only their status
  row changes.

## Verification

- Every PRD file follows `PRD-NN-slug.md`, and the set of files under
  `prds/` matches the set referenced in `PROGRESS.md` (no orphans, none
  missing).
