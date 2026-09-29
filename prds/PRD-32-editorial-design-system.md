# PRD-32 — Warm editorial design system + dashboard layout

> Tiny PRD per `DESIGN.md` §16b. Ambiguity -> STOP, load `grill-me`.

## Goal

Replace the "light polish" look with a coherent **warm editorial, paper +
ink** visual language (owner decision 2026-09-29) and give `/app` a real
dashboard layout — calm, mobile-first, intimate; not gamified.

## Direction

- **Feel:** a shared notebook of small kind notes. Paper surfaces, ink
  text, one warm terracotta/rose accent, soft blush for hearts.
- **Type:** serif display for headings and for heart comments (they read
  like handwritten-ish notes, set in serif italic); sans for UI chrome.
  System stacks only (no web-font download in MVP).
- **Surfaces:** cards with subtle paper tint, hairline borders, small
  warm shadow; generous whitespace; 40rem reading column.
- **Motion:** tiny, purposeful — heart select scale, note fade-in; all
  disabled under `prefers-reduced-motion`.
- **Hearts:** custom inline SVG heart (not emoji) used everywhere.
- **Anti-patterns:** no confetti, no streak flames, no progress bars,
  no big numbers, no purple gradients.

## Scope

**In:**
- `tokens.css`: add `--color-surface`, `--color-heart`, `--color-heart-
  soft`, `--shadow-soft`, `--radius-lg`, type scale tokens; tune light +
  dark palettes (dark = warm ink-night, not grey). Existing token names
  kept (components rely on them).
- `global.css`: cards, buttons (primary / quiet), inputs, header
  (compact, sticky), app footer, dashboard grid, reduced-motion rules.
- `src/components/HeartIcon.tsx` (new) inline SVG.
- Dashboard composition in `/app`: greeting ("Hi Anna — for Bob"),
  composer card, balance line, timeline.
- Homepage `/` gets a real hero + 3-step "How it works" (§11c) using
  `APP_NAME` — copy honest per §3/§12a.

**Out:** logo/brand (name pending §14i), i18n (Phase 7), illustrations.

## Touched files / new files

- `src/styles/tokens.css`, `src/styles/global.css`
- `src/components/HeartIcon.tsx` (new)
- `src/routes/index.tsx`, `src/routes/app.tsx`
- `tests/unit/routes.test.tsx` (smoke still passes; home has How-it-works)

## Verification

1. Logical CSS properties only; no raw hues outside `tokens.css`.
2. Light + dark both legible (text contrast >= 4.5:1 for body).
3. 360px width: no horizontal scroll on `/`, `/app`.
4. `prefers-reduced-motion: reduce` disables transitions/animations.

## Open questions

None.

---

## Dev notes

- Tokens: added `--color-surface`, `--color-accent-fg`, `--color-heart`,
  `--color-heart-soft`, `--color-focus`, `--color-qr-bg` (QR quiet zone
  must stay light in dark theme), `--shadow-soft`, `--radius-lg`,
  `--measure`, `--ease`, and a `--text-*` scale. Existing names kept.
- Buttons are pill-shaped; `.quiet`, `.small`, `.link-button`,
  `.button` (for anchors).
- Serif italic is used for comments (the note feel). The header is
  sticky and translucent (`color-mix` + backdrop blur).
- Home: the h1 is `APP_NAME` (the routes smoke contract) styled as an
  eyebrow. The display tagline is a `<p class="hero-title">`, followed
  by a sample note card, 3-step How it works, and a "Plainly" honesty
  list (§3/§12a copy).
- `prefers-reduced-motion` kills all animation/transition.
- Visual QA: I can't view screenshots (no image input). The owner should
  check the deployed look, or open the PNGs in `/tmp/opencode/shots/`.
