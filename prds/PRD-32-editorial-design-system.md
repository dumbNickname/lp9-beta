# PRD-32 — Warm editorial design system + dashboard layout

> Status: see `PROGRESS.md`.
> Later changes: palette retuned (PRD-33); dashboard replaced by the
> worlds shell (PRD-49); motion and icon rules relaxed 2026-10-01.

## Goal

Replace the "light polish" look with a coherent warm editorial, paper +
ink visual language (owner decision 2026-09-29) and give `/app` a real
dashboard layout: calm, mobile-first, intimate, not gamified.

## What shipped

- Feel: a shared notebook of small kind notes. Paper surfaces, ink text,
  one warm terracotta/rose accent, soft blush for hearts.
- Type: serif display for headings and for heart comments (serif italic,
  note feel); sans for UI chrome. System font stacks only.
- Surfaces: tinted cards, hairline borders, small warm shadow, generous
  whitespace, ~40rem reading column. Pill-shaped primary and quiet
  buttons.
- Design tokens extended (surface, heart, focus, shadow, radius, measure,
  easing, type scale); existing token names kept. A dedicated QR
  background token keeps the QR quiet zone light in dark theme.
- Custom inline SVG heart used everywhere (not emoji).
- Sticky compact translucent header; dashboard: greeting ("Hi Anna — for
  Bob"), composer, balance line, timeline.
- Home `/`: `APP_NAME` as the h1 (routes smoke contract), display
  tagline, sample note card, 3-step "How it works" (§11c) and a "Plainly"
  honesty list (§3/§12a copy).
- Anti-patterns: no confetti, streak flames, progress bars, big numbers
  or purple gradients.

Out: logo/brand (name pending §14i), i18n (Phase 7), illustrations.

## Verification

- Logical CSS properties only; no raw hues outside the tokens file (QA
  test).
- Body text contrast >= 4.5:1 in light and dark.
- No horizontal scroll at 360px on `/` and `/app`.
- `prefers-reduced-motion: reduce` disables all transitions/animations.
- Owner-pending: visual look check on the deployed site (agent cannot
  view images).

## Later changes

- Palette: "ember" dark and warmer light canvas (PRD-33).
- Site header hidden inside `/app` since PRD-49; the app has its own app
  bar (mobile two rows since 2026-10-01).
- Owner 2026-10-01: tasteful motion allowed (still none under reduced
  motion); still no streaks, scores or comparisons; line icons replace
  emoji glyphs in the UI.
