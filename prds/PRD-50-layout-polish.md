# PRD-50 — Layering, column alignment, calendar whose-wish, claim chips

> Status: see `PROGRESS.md`.

## Goal
Owner feedback 2026-09-29 on PRD-49: fix the menu hidden under the tab
bar, misaligned columns, unclear calendar and noisy claim status.

## What shipped
- **Layering:** the app bar sits above the tab bar but below sheets, so
  its "⋯" menu and popovers are no longer covered (popovers live in the
  app bar's stacking context).
- **Column alignment:** section headers share the card edge (no
  bleed); both columns start on the same line.
- **Add a wish** open by default on desktop (>= 56rem) with a heading;
  stays open and resets empty after submit. Mobile keeps it collapsed;
  the empty state always shows "+ Add a wish".
- **Coming up whose-wish:** calendar days tinted amber (a wish for you)
  / sage (for partner), split diagonally when both; plan dots and rows
  match; legend "for you / for Ben".
- **Claim status de-noised:** "Ben said yes" plus a coloured when-chip
  (`today` = rose filled, `soon` <= 7d = amber, `later`/undated =
  muted, "date to agree"); no duplicate date. A "Details" toggle shows
  timestamps. A state dot before the status (dashed = waiting, sage =
  agreed, rose = delivered).
- **Coupon chips** carry a marker: Agreed (sage), Waiting, You have
  enough, Claimed.
- **Follow-up (owner 2026-09-29):** ticket notch circles removed (they
  looked like stray dots mid-card on mobile); the perforation is just
  the dashed divider. "5 more" moved next to the status chip as
  "Agreed · 5 more hearts to go"; the stub shows only the price.

## Verification
- Local prod build: menu hit-tested above the tab bar on mobile +
  desktop; equal column tops at 1280px; chips covered by unit tests.

## Gotchas
- Popovers can't escape their parent's stacking context: raise the
  parent, not the popover.

## Later changes
- Chip glyphs replaced by line icons (owner 2026-10-01).
