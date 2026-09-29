# PRD-33 — Palette refresh: "ember" dark mode + livelier light canvas

> Tiny PRD per `DESIGN.md` §16b.

## Goal

Owner feedback 2026-09-29: dark mode is "too dark and boring", and the
light bg is a bit flat. Dark mode is rebuilt from the Start-together
terracotta, deepened into the canvas. All text pairs are re-checked for
contrast.

## Scope

**In:** `src/styles/tokens.css` values only (+ `--color-bg-glow`), and
the body radial glow in `global.css`.
**Out:** layout, components, brand/logo.

## Verification

1. WCAG contrast >= 4.5:1 for fg / muted-fg / accent text on bg, surface
   and muted-bg in both themes (accent on muted-bg in light: 4.9).
   Hearts are icons (>= 3:1).
2. No raw hues outside `tokens.css` (existing QA test).

## Open questions

None.

---

## Dev notes

- Dark "ember": bg `#3a1f19`, surface `#4a2a22`, ink `#fbeee2`, accent
  `#f2a07b` (8.3:1 with dark button text), heart `#ff9aac`. Measured
  ratios: fg/bg 13.3, muted/bg 8.7, accent/surface 6.1.
- Light: warmer sand bg `#f4ebe0` + peach radial glow at the top
  (`--color-bg-glow`). Accent darkened to `#96482e` (was 4.5, now
  5.5 on bg); heart `#b03f58`.
- Contrast was computed with a throwaway script (WCAG relative
  luminance).
