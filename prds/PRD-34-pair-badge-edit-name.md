# PRD-34 — Pair badge + edit my display name

> Status: see `PROGRESS.md`.
> Later changes: multi-relationship switcher added to the badge
> (PRD-43); avatars restyled in the 2026-10-01 visual redesign.

## Goal

Show who you're paired with at a glance ("Anna & Bob" with initials) and
let you rename yourself, i.e. the name your partner sees. Owner request
2026-09-29 (a device was paired as "test1").

## What shipped

- Pair badge: overlapping initial avatars with a heart and a
  "Me & Partner" title; unknown partner shows "your partner". Initials
  take the first full character, so a leading emoji is not split.
- Inline "Edit my name": trimmed, 1..50 chars (same rule as onboarding),
  saved through the existing `profiles` own-row UPDATE policy. No schema
  change.
- Partner name re-fetched on tab focus so their rename shows up.

Out:
- Private nickname for the partner (only you see it): parked in
  `IDEAS.md` until the owner confirms interest.
- Multi-relationship switcher (§4 single-pair UI first): done in PRD-43.

## Verification

- Unit tests: both names and initials shown; unknown-partner fallback;
  rename trims, rejects empty, caps at 50.
- Partner device shows the new name after refocus.
