# PRD-34 — Pair badge + edit my display name

> Tiny PRD per `DESIGN.md` §16b.

## Goal

The dashboard shows who you're paired with at a glance ("Anna & Bob"
with initials), and lets you rename yourself: the name your partner
sees. Owner request 2026-09-29 (a device was paired as "test1").

## Scope

**In:**
- `src/components/PairBadge.tsx`: overlapping initial avatars with a
  heart, "Me & Partner" title, and an inline "Edit my name" form
  (trimmed, 1..50 chars; same rule as onboarding) via
  `saveProfile({display_name})`.
- The partner name is re-fetched on tab focus so the partner's rename
  appears.
**Out:**
- A private nickname for the partner (only you see it). Parked in
  `IDEAS.md` until the owner confirms interest.
- Multi-relationship switcher (§4: single-pair UI first).

## Data model impact

None. Uses the existing `profiles` own-row UPDATE policy.

## Verification

1. Paired dashboard shows both names + initials; unknown partner shows
   "your partner".
2. Rename saves the trimmed value; empty is rejected; 50-char max.
3. The partner's device shows the new name after refocus.

## Open questions

None.

---

## Dev notes

- Tests: `tests/unit/pair-badge.test.tsx` (5).
- `initial()` uses `Array.from` so a leading emoji/surrogate pair isn't
  split.
