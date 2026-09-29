# PRD-50 — Layering, column alignment, calendar whose-wish, claim chips

Owner feedback 2026-09-29 on PRD-49.

## Scope + Dev notes
- **⋯ menu under the tab bar:** popovers live inside `.appbar`'s
  stacking context (z 20) while `.tabbar` is z 25. The app bar is now
  z 40 (> tabbar 25, < sheet 50). Verified via `elementFromPoint` on
  mobile + desktop.
- **Column alignment:** section headers no longer bleed with a negative
  margin; they share the card edge. First children of both columns
  have no top margin -> the columns start on the same line (measured
  equal tops on My wishes + For partner at 1280px).
- **Add a wish open by default on desktop** (>= 56rem, via
  `matchMedia` at mount), with an "Add a wish" heading. After submit
  it stays open and remounts empty (keyed `formKey`). Mobile keeps it
  collapsed; the empty state now always shows the "+ Add a wish" button.
- **Coming up whose-wish:** calendar days are tinted amber (a wish for
  you) / sage (for partner), split diagonally when both. Per-plan dots
  and plan rows carry the same colour; a legend "for you / for Ben".
- **Claim status de-noised:** "Ben said yes" plus a coloured when-chip
  (`today` = rose filled, `soon` <= 7d = amber, `later`/undated =
  muted, "date to agree"). The duplicate "(Thu, Oct 1)" is gone. A
  "Details" toggle reveals timestamps (claimed/accepted/planned/
  delivered/…/hearts). A state dot before the status (dashed = waiting,
  sage = agreed, rose = delivered).
- **Coupon chips** get glyphs: ✓ Agreed (sage), … Waiting, ♥ You have
  enough, ➜ Claimed.

## Verification
Local prod build, 14/15 checks pass; the remaining one is a test
artifact (no Agreed chip on that screen); covered by the unit test.
