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
- **Sub-path base (GitHub Pages):** SolidStart does NOT wire `BASE_PATH`
  into the router. `src/app.tsx` passes
  `base={import.meta.env.SERVER_BASE_URL}` (trailing slash trimmed) to
  `<Router>` — without it the router matches the prefixed URL (e.g.
  `/lp9-beta/`) against root routes, finds nothing, and renders an empty
  `<main>` (blank page). `app.config.ts` also prefixes the prerender
  routes with `basePath` for the same reason.
- **Theming (`src/lib/theme.ts`, `src/styles/`):**
  - Three modes: light / dark / system; default system.
  - No-flash: `THEME_INIT_SCRIPT` is injected into `<head>` in
    `entry-server.tsx` **before** the stylesheet, setting
    `data-theme` pre-paint. Keep it before any CSS.
  - Colors are semantic CSS custom properties in
    `src/styles/tokens.css` (`--color-bg`, `--color-surface`,
    `--color-fg`, `--color-muted-*`, `--color-border`, `--color-accent`,
    `--color-accent-fg`, `--color-heart`, `--color-heart-soft`,
    `--color-focus`, `--color-qr-bg`) plus `--text-*`, `--space-*`,
    `--radius*`, `--shadow-soft`, `--measure`, `--ease`. Light on
    `:root`, dark on `[data-theme="dark"]`. Components reference
    tokens, never raw hues (a QA test greps for this).
  - **Visual language (PRD-32): warm editorial, paper + ink.** Serif
    display + serif italic for heart comments. Sans for UI chrome. Pill
    buttons (`.quiet`, `.small`, `.link-button`, `.button` for anchors).
    `.card` surfaces. Custom SVG hearts (`HeartIcon`), never emoji. No
    confetti/streaks/progress bars/big numbers. All motion is off under
    `prefers-reduced-motion`. The brand designer revises once the name
    is locked (§14e).
- **CSS uses logical properties only** (`margin-inline`, `padding-block`,
  `border-*-end`, etc.) — RTL-ready from day one (`DESIGN.md` §12e). No
  `margin-left`/`right`/`top`-style physical properties.
- **Supabase client (`src/lib/supabase.ts`):** single `createClient`
  instance; throws at module load if `VITE_SUPABASE_URL` or
  `VITE_SUPABASE_ANON_KEY` is missing. Accepts both `sb_publishable_`
  and legacy JWT anon keys.
- **Session (`src/lib/session.ts`):** reactive `session()`, `user()`,
  `loading()` signals. `initSession()` resumes existing session or
  calls `signInAnonymously()`. `subscribeToAuthChanges()` keeps signals
  in sync. Wired into the app via `SessionProvider` component.
- **Storage access is defensive:** wrap `localStorage`/`matchMedia` in
  try/catch (private-mode / SSR). See `src/lib/theme.ts` for the pattern.
- Path alias `~/*` → `src/*`.

- **Data layer (`src/lib/data/`)**: all Supabase calls live here.
  `bytea.ts` has the `\x` hex helpers (shared). `points.ts` has the
  hearts reads plus the `give_points`/`edit_point_comment`/`delete_point`
  RPCs and `friendlyPointsError`.
- **Stores (`src/lib/stores/`)**: module-level signals + `refresh*()` +
  `use*FocusRefresh()` (§9a/§9c). `points.ts` decrypts into
  `FeedItem`s, exposes `mySpendable()`, and `hasCommentKey()`
  (tri-state: `null` = unchecked).
- **Comments E2E (`src/lib/crypto/comments.ts`)**: `encryptComment`
  throws without a key, so it can never send plaintext.
  `decryptComment` returns null on failure. Everything else is
  plaintext (§12a).
- **Privacy mode (`src/lib/privacy.ts`)**: in-memory signal, ON at
  every load (§15c). Any component showing comment text must check
  `privateMode()`.
- **Balance (`src/lib/balance.ts`)**: pure, computed, never stored
  (§13b). Only the viewer's own balance is ever rendered.
- **Dashboard (`components/Dashboard.tsx`)**: composes the composer,
  feed, balance, privacy toggle and restore-key flow. `routes/app.tsx`
  only gates (session → profile → relationship).

## Work Guidance

- No scoreboards: never render sums, counts, partner balance, or
  given-vs-received comparisons (§5b, owner 2026-09-29).

## Verification

- `pnpm typecheck && pnpm lint && pnpm test` for this tree.
- Route components have smoke tests in `tests/unit/`; theme pure
  functions are unit-tested there too.

## Child DOX Index

- None. `src/` is a single durable boundary; sub-folders (`routes/`,
  `components/`, `lib/`, `styles/`) are covered by this doc.
