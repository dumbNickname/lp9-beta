# PRD-33 — Palette refresh: "ember" dark mode + livelier light canvas

> Status: see `PROGRESS.md`.

## Goal

Owner feedback 2026-09-29: dark mode was "too dark and boring" and the
light background a bit flat. Rebuild dark mode from the Start-together
terracotta deepened into the canvas, warm up the light canvas, and
re-check every text pair for contrast.

## What shipped

- Token values only (plus a background glow token and a soft radial glow
  at the top of the page); no layout or component changes.
- Dark "ember": deep terracotta-brown canvas and surface, warm cream ink,
  light peach accent, pink heart.
- Light: warmer sand background with a peach glow; accent and heart
  darkened for contrast.

Out: layout, components, brand/logo.

## Decisions

- Contrast rule: fg, muted fg and accent text must reach WCAG >= 4.5:1
  on bg, surface and muted bg in both themes; hearts are icons (>= 3:1).
- Measured at ship: dark fg/bg 13.3, muted/bg 8.7, accent/surface 6.1,
  accent with dark button text 8.3; light accent on bg 5.5, accent on
  muted bg 4.9.

## Verification

- Contrast computed with WCAG relative luminance for all pairs above.
- No raw hues outside the tokens file (existing QA test).
