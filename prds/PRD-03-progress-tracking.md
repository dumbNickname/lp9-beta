# PRD-03 — Progress tracker + `prds/` convention

## Goal

Lock in the file conventions for tracking work: `PROGRESS.md` at root
as the single status table, `prds/PRD-NN-slug.md` as immutable PRD
paths, `prds/PRD-template.md` as the canonical PRD shape.

## Scope

**In:**
- Confirm `PROGRESS.md` is committed and matches the format in
  `DESIGN.md` §16d.
- Confirm `prds/PRD-template.md` is committed and is the contract for
  all future PRDs.
- A short `prds/README.md` explaining: numbering, status flow, how
  PRDs interact with `PROGRESS.md`.

**Out:**
- Decomposing future-phase PRDs (done lazily per phase per
  `PROGRESS.md` "decomposition rule").
- Tooling automation around PRD status transitions (manual edits to
  `PROGRESS.md` are fine for MVP).

## Touched files / new files

- `PROGRESS.md` — already created; this PRD verifies it.
- `prds/PRD-template.md` — already created; this PRD verifies it.
- `prds/README.md` — new, ~30 lines.

## Data model impact

None.

## UI behavior

None.

## Verification

1. `PROGRESS.md` exists at repo root.
2. `prds/PRD-template.md` exists.
3. `prds/README.md` exists and explains numbering + status flow.
4. Every PRD file under `prds/` follows `PRD-NN-slug.md` naming.
5. Every PRD listed in `PROGRESS.md` Phase 0 has a corresponding file
   in `prds/`.

**Unit tests:** none.

**QA suite:**
- Script: `ls prds/PRD-*.md` and `grep -oE 'prds/PRD-[0-9]+-[a-z-]+\.md' PROGRESS.md`
  produce the same set (no orphan PRDs, no missing PRDs).

## Open questions

None — convention is owner-confirmed.
