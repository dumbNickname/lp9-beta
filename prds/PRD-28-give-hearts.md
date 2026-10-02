# PRD-28 — Give hearts (composer, encryption, backdating)

> Status: see `PROGRESS.md`.
> Later changes: composer now lives in the Give world (PRD-49), not a
> single dashboard.

## Goal

A paired user can give their partner 1-5 hearts with an optional
end-to-end encrypted comment (up to 200 chars) and an optional backdated
event date. Calm, not gamified: no confetti, streaks or counts.

## What shipped

- Heart picker: 5 hearts as an accessible radiogroup (arrows, Home/End,
  "N hearts" labels); nothing selected by default; send disabled until
  chosen.
- Comment field with live counter, hard cap 200 chars (§12c). Placeholder
  rotates between noticing prompts ("What did they do that you loved?").
- "When?": defaults to today; an "earlier" link reveals a date picker
  bounded to the last 30 days through local today (D-27.2).
- Comments are encrypted on the device with the pair key (AES-GCM, fresh
  12-byte IV); empty comment sends null/null. Plaintext is never sent or
  logged; encryption throws instead of falling back when no key exists.
- No key on this device (owner decision 2026-09-29): comment field
  disabled with a note and an "Unlock with recovery password" action;
  hearts-only send still allowed. Key check is tri-state so the composer
  never flashes "locked" before the check finishes.
- After send: gentle confirmation ("Sent. They'll see it next time they
  open the app."), form resets, list refreshes at once (own actions feel
  instant, §9a). Partner's display name shown ("For Bob").

Out: feed (PRD-29), balance (PRD-30), bonus heart, emails (Phase 6).

## Decisions

- No-key behaviour: block the comment, allow hearts-only, offer restore
  (owner, 2026-09-29).
- Shipped together with PRD-29..32 as one dashboard slice.

## Verification

- Unit tests: RPC receives ciphertext + 12-byte IV and no plaintext;
  empty comment -> nulls; 200-char cap; date bounds; no-key state;
  keyboard selection; encrypt/decrypt round-trip and missing-key failure.
