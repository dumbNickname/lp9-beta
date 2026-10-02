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
    `--color-focus`, `--color-qr-bg`, `--color-bg-glow`, `--world-*`) plus `--text-*`, `--space-*`,
    `--radius*`, `--shadow-soft`, `--measure`, `--ease`. Light on
    `:root`, dark on `[data-theme="dark"]`. Components reference
    tokens, never raw hues (a QA test greps for this).
  - **Visual language (PRD-32/33): warm editorial, paper + ink.** Light
    theme = sand paper + peach glow. Dark theme = "ember" (deep
    terracotta, not grey/black; owner decision). Any token change
    must keep text >= 4.5:1 in both themes. Serif
    display + serif italic for heart comments. Sans for UI chrome. Pill
    buttons (`.quiet`, `.small`, `.link-button`, `.button` for anchors).
    `.card` surfaces. Custom SVG hearts (`HeartIcon`) and line icons
    (`Icons.tsx`), never emoji glyphs for UI. No streaks/progress
    bars/big numbers/scores. Tasteful motion is OK (owner 2026-10-01):
    send heart burst, paired moment, jar drop. All motion is off under
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
- **`<base href>` gotcha:** `entry-server.tsx` sets `<base href=BASE_PATH>`,
  so relative URLs in `history.replaceState/pushState` (e.g. `"#x"`)
  resolve to the site root and drop `/app`. Always pass
  `location.pathname + location.search + hash`.
- **PWA (PRD-52)**: static files in `public/` (copied to the site root
  under BASE_PATH): `manifest.webmanifest` (relative URLs), `icons/`,
  `sw.js` (never caches cross-origin; bump `CACHE` name when changing
  caching). theme-color follows the theme via `lib/theme.ts`.
- Path alias `~/*` → `src/*`.

- **Data layer (`src/lib/data/`)**: all Supabase calls live here.
  `bytea.ts` has the `\x` hex helpers (shared). `points.ts` has the
  hearts reads plus the `give_points`/`edit_point_comment`/`delete_point`
  RPCs and `friendlyPointsError`.
- **Stores (`src/lib/stores/`)**: module-level signals + `refresh*()` +
  `use*FocusRefresh()` (§9a/§9c). `points.ts` decrypts into
  `FeedItem`s, exposes `mySpendable(userId)`, and `hasCommentKey()`
  (tri-state: `null` = unchecked).
- **Comments E2E (`src/lib/crypto/comments.ts`)**: `encryptComment`
  throws without a key, so it can never send plaintext.
  `decryptComment` returns null on failure. Everything else is
  plaintext (§12a).
- **Privacy mode (`src/lib/privacy.ts`)**: OFF by default, remembered
  per device (`privacy_mode`) (§15c amended). One switch: the eye in
  `AppBar` (`PrivacyToggle`; Settings mirrors it). Components showing
  comment text or private wishes check `isVeiled(id)` and render a
  tappable veil that calls `askReveal(id)` (3-way `choiceSheet`).
- **Invite links (`src/lib/pairing/pendingJoin.ts`)**: `#pair=` is
  captured once at shell mount into an in-memory signal and stripped
  from the URL; `PairFlow` and `Onboarding` read it from there. Never
  persist it (carries the AES key). Store `*Loading` flags gate only
  the first load (later refreshes update in place); Dashboard is keyed
  by relationship **id**. Breaking either remounts the shell and loses
  the invite / drafts.
- **Inviter key handoff (`lib/pairing/pendingInvite.ts`)**: the
  inviter's temp key (`invite:<code>`) is moved onto the new pair by
  whichever notices it first: PairFlow's poll or the relationship
  store's refresh (`adoptPendingInvite`). The poll alone is not enough;
  background tabs freeze timers.
- **Paired moment**: `onNewRelationship()` sets `justPaired`; the
  shell shows `PairedMoment` (full-screen) before the recovery prompt.
- **Coupons**: `lib/data/coupons.ts` (RPC wrappers, `PRICE_MIN/MAX`),
  `lib/stores/coupons.ts` (mutate-then-refetch), `components/Coupon*`
  + `TemplatePicker`. Templates live in `src/data/coupon-templates.ts`
  (single file for Phase 7 i18n). Private coupon flags:
  `lib/privateCoupons.ts` (device-local localStorage, §15b).
- **Balance (`src/lib/balance.ts`)**: pure, computed, never stored
  (§13b). Only the viewer's own balance is ever rendered.
- **Relationships (PRD-43)**: `lib/stores/relationship.ts` holds all
  active pairs + the selected one (`?rel=` > localStorage
  `active_relationship` > newest). `routes/app.tsx` remounts Dashboard
  keyed by relationship; per-pair stores (points/coupons/claims) expose
  `reset*()` and ignore stale responses. Any new per-pair store must do
  the same.
- **Claims (PRD-41/42)**: `lib/data/claims.ts`, `lib/stores/claims.ts`
  (`refreshClaims` runs the lazy 14-day sweep first), `ClaimRow`,
  `ComingUp`. Balance = received − open − delivered claims, mirroring
  SQL `spendable_hearts`.
- **Dashboard (`components/Dashboard.tsx`, PRD-49)**: `AppBar` (home
  link, pair switcher, balance pill, eye, ⋯ menu; CSS grid: 2 rows on
  mobile with the balance as a full-width wallet strip, 1 row on
  desktop; publishes its height as `--appbar-h` for sticky offsets) + `TabBar` with three
  **worlds**: Give (composer + notes), My wishes (`MyWishes`), For
  partner (`ForPartner`). Hash-synced (`#mine`, `#theirs`; legacy
  `#coupons`), plus pages `#settings` = `SettingsPage` (You / Pairs /
  This device / About) and `#guide` = `GuidePage` (visual how-it-works),
  both opened from the ⋯ menu (`readPage()` in `TabBar.tsx`). The Give
  world side column has `NoteJar` (memory jar of partner notes).
  World colours: `--world-*` tokens, set per world via
  `--w`/`--w-soft` on `.world--*`; sections use `Section.tsx` (sticky
  tinted header). The site header is hidden on `/app`. `routes/app.tsx`
  only gates (session → profile → relationship).

- **Z-index scale**: section heads 5, site header 10, tabbar 25,
  appbar (+ its popovers) 40, confirm sheet 50/51, paired moment 60.
  Coachmarks sit in flow (never overlay controls). Popovers inherit
  their parent's stacking context, so raise the container, not the
  popover.
- **Confirms**: use `confirmSheet()` from `components/ConfirmSheet.tsx`,
  never `window.confirm` (host is mounted in `routes/app.tsx`).
- **Device-local markers** (localStorage): `private_coupons`,
  `privacy_mode`, `privacy_hint_seen`,
  `active_relationship`, `last_seen:<rel>`, `recovery_prompted:<rel>`,
  `pair_invite_pending`, `archetype_hint`. Any new key must be added to
  `resetAccount()` in `lib/session.ts`.

## Work Guidance

- No scoreboards: never render sums, counts, partner balance, or
  given-vs-received comparisons (§5b, owner decision). Fun, non-comparing
  data visualisation (e.g. the "watch rings" idea) is OK.
- **Copy tone:** warm, short, no jargon, honest about anonymity and
  encryption (§3). Never show raw timestamps by default; put them behind
  a "Details" toggle.
- **CSS:** `global.css` is append-grown. Before adding a selector, grep
  for an existing one and edit it instead (duplicates exist, see
  `REVIEW.md` #13). New world-aware styles use `--w` / `--w-soft`.
- **Coachmarks/hints sit in the normal flow**, never `position:
  absolute` over content: an overlay hint covered the ⋯ menu, Back and
  the heart picker. Show them only where relevant (one world, no menu
  open) and dismiss on first use.
- **Sticky offsets use `--appbar-h`**, never a hard-coded bar height
  (the bar is 2 rows on mobile).
- **Mobile first, then check 360px + 1280px** for overflow (`min-inline-
  size: 0`, `minmax(0, 1fr)` in grids) and fixed/sticky layering.
- **Desktop may pre-open forms** (e.g. "Add a wish") to use the space;
  mobile keeps them collapsed.

## Verification

- `pnpm typecheck && pnpm lint && pnpm test` for this tree.
- Route components have smoke tests in `tests/unit/`; theme pure
  functions are unit-tested there too.
- UI changes: also build locally (`BASE_PATH=/lp9-beta/`) and run a
  Playwright DOM check (root AGENTS.md "Local E2E" recipe), then re-run
  against the live site after deploy.

## Child DOX Index

- None. `src/` is a single durable boundary; sub-folders (`routes/`,
  `components/`, `lib/`, `styles/`) are covered by this doc.
