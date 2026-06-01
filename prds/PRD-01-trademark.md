# PRD-01 — Trademark notice

## Goal

Reserve the project's name and logo from derivative works via a
`TRADEMARK.md` file, asserting unregistered ("common law") trademark
rights until formal registration after a name is locked in.

## Scope

**In:**
- `TRADEMARK.md` at repo root with the structure:
  - Statement of unregistered trademark claim over the project's
    name (placeholder `APP_NAME` until §14 resolves) and logo (TBD).
  - Required action by forks: **rename** before redistributing.
  - Explicit note that the **code** is governed by the AGPL-3.0
    license in `LICENSE` — TRADEMARK.md addresses brand only.
  - Pointer to `DESIGN.md` §17 for the full reasoning.

**Out:**
- Actual trademark registration (deferred to post-naming, `HANDOFF.md`
  Phase 10).
- Logo file or brand visual identity (depends on name; deferred).

## Touched files / new files

- `TRADEMARK.md` — new.

## Data model impact

None.

## UI behavior

None.

## Verification

1. `TRADEMARK.md` exists at repo root.
2. File explicitly says: name and logo are **not** licensed under
   AGPL; forks must rename.
3. File references `LICENSE` for the code terms.
4. File references `DESIGN.md` §17 for rationale.

**Unit tests:** none.

**QA suite:**
- Cross-read `LICENSE` and `TRADEMARK.md` together: they must not
  contradict (e.g., AGPL alone could imply the name is included with
  the code; TRADEMARK.md must clearly carve the name out).

## Open questions

- The placeholder name `APP_NAME` will be search-and-replaced once
  §14 resolves. Use a string distinctive enough that grep for
  `APP_NAME` finds every occurrence.
