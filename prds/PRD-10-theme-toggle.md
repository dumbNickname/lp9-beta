# PRD-10 — Theme toggle + CSS custom properties

> Status: see `PROGRESS.md`.

## Goal

Three-mode theme (light / dark / system, `DESIGN.md` §12f) with no flash
of the wrong theme on first paint, built on CSS custom properties on
`:root` with a `[data-theme="dark"]` override.

## What shipped

- Small semantic colour token set (bg, fg, muted bg/fg, border, accent)
  documented in a tokens stylesheet as the designer's surface. Light on
  `:root`, dark overrides on `[data-theme="dark"]`.
- No-flash: an inline init script in the HTML head, placed before the
  stylesheet, reads `localStorage("theme")` and sets `<html data-theme>`;
  falls back to `prefers-color-scheme`.
- Toggle cycles light -> dark -> system and persists the choice; system
  mode follows OS changes live via a matchMedia listener.
- Garbage or missing stored value -> system. Storage unavailable
  (private mode, SSR) degrades silently, never throws.
- Logical CSS properties only (§12e), RTL-ready.
- Data: theme lives in `localStorage` only; a per-user
  `user_settings.theme` column is reserved for later sync.
- Out: final palette/brand (§14e), typography and layout systems.

## Decisions

- Token naming: semantic role names (`--color-bg`, `--color-fg`, ...)
  over design-system names.
- MVP direction: warm editorial minimalism; bone canvas, charcoal ink,
  one muted warm accent. Deliberately no gamified/scoreboard hues.
  System font stacks, no web-font load.
- Init script is injected as a static, non-user string; the one
  no-innerHTML lint suppression is limited to it.

## Verification

- Unit tests on the pure functions (normalise, resolve effective theme,
  next choice), incl. garbage/null -> system.
- Prerendered HTML checked: init script precedes CSS. CSS grep finds no
  physical left/right properties.
- Typecheck, lint, build pass.

## Gotchas

- The init script must stay before the CSS link, or the wrong theme
  flashes.

## Later changes

- Visual rules evolved (owner 2026-10-01): tasteful motion allowed,
  line icons instead of emoji glyphs; still no streaks/scores. See
  `DESIGN.md` and `src/AGENTS.md` for the current look and feel.
