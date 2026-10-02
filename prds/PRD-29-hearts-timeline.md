# PRD-29 — Hearts timeline (decrypt, edit/delete windows)

> Status: see `PROGRESS.md`.
> Later changes: privacy veil behaviour per PRD-31 later changes; the
> timeline now sits inside the worlds shell (PRD-49).

## Goal

One chronological timeline of hearts received and given in the pair,
comments decrypted on the device, with the §5d edit (24h) and silent
delete (5 min) affordances for the giver.

## What shipped

- One timeline, newest first (owner decision 2026-09-29). Received notes
  are the visual focus (solid card, rose edge); given notes are quieter
  (dashed, muted, "You -> Bob").
- Per entry: N small hearts, decrypted comment, relative date from
  `event_date`, a "noted <day>" mark only when backdated, and an "edited"
  badge when edited (original text never kept, §5d).
- No totals, sums or counts anywhere (owner decision); amount shown only
  per entry.
- Comment that cannot be decrypted -> "Comment locked on this device" +
  restore link.
- Giver-only actions, shown only inside the window (client check with a
  short tick; server stays the authority):
  - Edit comment within 24h: inline, re-encrypted with a fresh IV.
  - Undo within 5 min: one tap, no confirm ("oops" affordance); entry
    disappears, silent to the partner.
- Edit is hidden while private mode is on (it would reveal the text).
- Manual refresh + refresh on focus (§9a). Empty state invites noticing:
  "Nothing yet. Notice one small thing today."
- First 50 entries only; "older" pagination deferred to `IDEAS.md`.

Out: privacy veil (PRD-31), balance (PRD-30).

## Verification

- Unit tests: received and given interleaved by creation time; locked
  placeholder without key; edit/undo visibility per window and role;
  edited badge; no aggregate number rendered.
