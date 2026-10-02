# PRD-00 — License file (AGPL-3.0-or-later)

> Status: see `PROGRESS.md`.

## Goal

Ship the canonical AGPL-3.0 text in the repo so the project has a legally
meaningful open-source license from commit one.

## What shipped

- `LICENSE` at repo root: verbatim FSF AGPL-3.0 text
  (https://www.gnu.org/licenses/agpl-3.0.txt), Version 3, 19 November 2007.
- Only addition: the project copyright line at the top
  (`Copyright (C) 2026 <holder>`).
- Out: README license mention (PRD-02); per-file SPDX headers (deferred,
  `DESIGN.md` §17e); trademark notice (PRD-01).

## Decisions

- Copyright holder (legal name vs project name vs handle) was left to the
  owner; the shipped line uses the owner's handle.

## Verification

- Diff against the FSF canonical text: only the copyright line differs;
  full text present (600+ lines).
- gitleaks does not flag the file (path allowlisted, PRD-06).
