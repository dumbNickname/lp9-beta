# PRD-01 — Trademark notice

> Status: see `PROGRESS.md`.

## Goal

Reserve the project's name and logo from derivative works via
`TRADEMARK.md`, asserting unregistered ("common law") trademark rights
until formal registration once a name is locked in.

## What shipped

- `TRADEMARK.md` at repo root:
  - claims unregistered trademark over the name (placeholder `APP_NAME`
    until `DESIGN.md` §14 resolves) and logo (TBD);
  - forks must **rename** before redistributing;
  - name and logo are not licensed under AGPL; code terms live in
    `LICENSE`, this file covers brand only;
  - points to `DESIGN.md` §17 for the reasoning.
- Out: formal registration (post-naming, `HANDOFF.md` Phase 10); logo and
  brand identity (depend on the name).

## Decisions

- Placeholder `APP_NAME` is deliberately distinctive so one grep finds
  every occurrence for the later search-and-replace.

## Verification

- Cross-read with `LICENSE`: no contradiction; the name is clearly carved
  out of the AGPL grant.

## Open questions

- Product name still unchosen (`DESIGN.md` §14i).
