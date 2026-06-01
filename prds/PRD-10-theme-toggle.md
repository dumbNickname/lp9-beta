# PRD-10 — Theme toggle + CSS custom properties

## Goal

Implement the three-mode theme system (light / dark / system) per
`DESIGN.md` §12f, with no flash of wrong theme on first paint, using
CSS custom properties on `:root` and a `[data-theme="dark"]` override.

## Scope

**In:**
- CSS custom properties on `:root` for color tokens (a small token set
  is enough for MVP: bg, fg, muted-bg, muted-fg, border, accent).
  Mirror m-tynki's pattern for the technique, NOT the values — pick
  fresh values appropriate for a warm relationship app.
- `[data-theme="dark"]` selector overriding the same tokens with dark
  values.
- Inline script in `entry-server.tsx`'s HTML head reading
  `localStorage("theme")` **before paint** to set
  `<html data-theme>` correctly. Defaults to system preference via
  `prefers-color-scheme`.
- `<ThemeToggle />` component placed in the app header (or homepage
  header) cycling light → dark → system.
- Logical CSS properties used throughout (`margin-inline-start`,
  `padding-block`, etc.) per §12e — RTL-ready from day one.
- Tokens documented in `src/styles/tokens.css` (or similar) with brief
  comments so the future visual designer has a clear surface to
  iterate on.

**Out:**
- Final color palette / brand colors (depends on name + branding,
  §14e). MVP picks neutral, defensible values; designer revises later.
- Typography, spacing, layout system beyond what tokens require.

## Touched files / new files

- `src/styles/tokens.css` — new.
- `src/styles/global.css` — new (imports tokens, base resets, logical
  properties).
- `src/components/ThemeToggle.tsx` — new.
- `src/lib/theme.ts` — new (read/write localStorage, system detection,
  `set-theme.html` inline-script string export).
- `src/entry-server.tsx` — updated to inject the inline theme script.
- `src/app.tsx` or root layout — imports global.css, mounts
  `<ThemeToggle />`.

## Data model impact

None (theme stored in `localStorage` only for MVP; a per-user
`user_settings.theme` column is in the schema for later sync).

## UI behavior

- First paint matches saved theme (or system) — **no flash**.
- Toggle cycles light → dark → system, persists choice.
- "system" mode follows OS preference live (matchMedia listener).

## Verification

1. Loading any route in a fresh browser respects
   `prefers-color-scheme`.
2. Setting theme to "dark" and reloading: no white flash before the
   dark theme paints.
3. Toggle cycles through all three modes; `localStorage("theme")`
   reflects the choice.
4. Removing `localStorage("theme")` and changing OS preference live:
   the page updates without reload (matchMedia listener works).
5. CSS audit: no `margin-left` / `padding-right` etc. in our own
   styles; only logical properties.

**Unit tests (Dev):**
- `src/lib/theme.ts` pure functions: read, write, resolve effective
  theme given (saved, system) inputs.

**QA suite:**
- Adversarial: simulate `localStorage` unavailable (private browsing
  edge case in some browsers) — toggle should degrade gracefully, not
  throw.
- Adversarial: set a garbage value in `localStorage("theme")` — the
  app should fall back to system, not crash.
- Verify Lighthouse "no flash of unstyled / wrong-theme content"
  observation on first load.
- Grep `src/` for `margin-left|margin-right|padding-left|padding-right|left:|right:`
  in CSS — should be empty (or annotated exceptions).

## Open questions

- Token names: use neutral semantic names (`--color-bg`, `--color-fg`)
  or design-system style (`--surface-1`, `--text-primary`)? Defer to
  Dev agent at execution time; document the chosen convention in
  `src/styles/tokens.css`.
