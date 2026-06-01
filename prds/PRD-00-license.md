# PRD-00 — License file (AGPL-3.0-or-later)

## Goal

Drop the canonical AGPL-3.0 license text into the repo so the project
has a legally meaningful open-source license from commit one.

## Scope

**In:**
- `LICENSE` at repo root containing the **verbatim** AGPL-3.0 text from
  the FSF (https://www.gnu.org/licenses/agpl-3.0.txt).
- Copyright line at the top of the license header section, e.g.
  `Copyright (C) 2026 <owner name or handle>`.

**Out:**
- README license badge / mention (covered in PRD-02).
- Per-file SPDX headers (deferred per `DESIGN.md` §17e).
- TRADEMARK.md (PRD-01).

## Touched files / new files

- `LICENSE` — new, full AGPL-3.0 text.

## Data model impact

None.

## UI behavior

None.

## Verification

1. `LICENSE` exists at repo root.
2. First non-blank line is `GNU AFFERO GENERAL PUBLIC LICENSE` (the
   official heading).
3. Version is `Version 3, 19 November 2007`.
4. File is byte-for-byte identical to the FSF canonical text **except**
   for the project's copyright line at the top of the preamble (the
   "Copyright (c) <year> <author>" placeholder is filled in).
5. `wc -l LICENSE` ≥ 600 lines (sanity check that the full text is
   present, not a stub).

**Unit tests:** none (static file).

**QA suite:**
- Diff `LICENSE` against `https://www.gnu.org/licenses/agpl-3.0.txt`;
  only the copyright line should differ.
- Confirm `gitleaks` does not flag the file (license text contains no
  secret-pattern false positives).

## Open questions

- Copyright holder name: owner's legal name, project name, or GitHub
  handle? Owner picks before this PRD is built.
