# src/AGENTS.md

## Purpose

SolidStart application code: routes, components, shared lib, styles, and
the client/server entry points. Public pages are statically generated;
`/app/*` is an SPA shell.

## Ownership

- Owns everything under `src/`.
- Does not own build config (`app.config.ts`, `vitest.config.ts`,
  `eslint.config.js`, `tsconfig.json` live at repo root and are owned by
  the root contract).

## Local Contracts

- **`APP_NAME` is the single source of truth for the product name**
  (`src/constants.ts`). Never hard-code the product name elsewhere;
  import the constant so the eventual rename is one line (`DESIGN.md`
  §14i).
- **Routing:** file-based under `src/routes/`. Public SSG routes: `/`
  (`index.tsx`), `/privacy`, `/terms`. SPA shell: `/app` — deep links
  into `/app/*` rely on the GH Pages `404.html` fallback
  (`scripts/post-build.sh`), so keep `/app` client-routable.
- **Theming (`src/lib/theme.ts`, `src/styles/`):**
  - Three modes: light / dark / system; default system.
  - No-flash: `THEME_INIT_SCRIPT` is injected into `<head>` in
    `entry-server.tsx` **before** the stylesheet, setting
    `data-theme` pre-paint. Keep it before any CSS.
  - Colors are semantic CSS custom properties in
    `src/styles/tokens.css` (`--color-bg`, `--color-fg`,
    `--color-muted-bg`, `--color-muted-fg`, `--color-border`,
    `--color-accent`). Light on `:root`, dark on `[data-theme="dark"]`.
    Components reference tokens, never raw hues.
  - Palette is warm-editorial placeholder (bone/charcoal + muted warm
    accent); the brand designer revises once the name is locked
    (`DESIGN.md` §14e). Not gamified/scoreboard hues.
- **CSS uses logical properties only** (`margin-inline`, `padding-block`,
  `border-*-end`, etc.) — RTL-ready from day one (`DESIGN.md` §12e). No
  `margin-left`/`right`/`top`-style physical properties.
- **Storage access is defensive:** wrap `localStorage`/`matchMedia` in
  try/catch (private-mode / SSR). See `src/lib/theme.ts` for the pattern.
- Path alias `~/*` → `src/*`.

## Work Guidance

- Data access (Phase 1+) goes through a thin swappable layer exposing
  `refresh()` per entity; all Supabase calls funnel through it
  (`DESIGN.md` §9c, HANDOFF 1.7–1.8). Not built yet.
- Comment text is E2E-encrypted client-side (AES-GCM via WebCrypto, no
  crypto library); everything else is plaintext (`DESIGN.md` §12a).
  Not built yet.

## Verification

- `pnpm typecheck && pnpm lint && pnpm test` for this tree.
- Route components have smoke tests in `tests/unit/`; theme pure
  functions are unit-tested there too.

## Child DOX Index

- None. `src/` is a single durable boundary; sub-folders (`routes/`,
  `components/`, `lib/`, `styles/`) are covered by this doc.
