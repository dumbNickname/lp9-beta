# PRD-08 — SolidStart + Vinxi bootstrap

## Goal

Stand up a minimal SolidStart + Vinxi project at repo root that builds
to a static site and serves the four placeholder routes the design
calls for: `/`, `/privacy`, `/terms`, `/app`.

## Scope

**In:**
- `package.json` with: solid-js, solid-start, vinxi, typescript (strict),
  pnpm as package manager, scripts: `dev`, `build`, `preview`, `lint`,
  `typecheck`.
- `app.config.ts` with `preset: "static"` and `BASE_PATH` handling
  (env var read at build time; `<base href>` rendered into the HTML
  shell and prefixed onto built asset URLs). `BASE_PATH` reads from
  env, defaulting to `/`.
- `tsconfig.json` strict.
- `src/entry-server.tsx` with HTML shell + `<base href>` derived from
  `BASE_PATH`. (Theme-init script slot exists but is empty; PRD-10
  fills it.)
- `src/entry-client.tsx` with SolidStart's default client-side router
  enabled (we want SPA navigation inside `/app/*`, see §11b).
- `src/app.tsx` minimal app shell.
- `src/routes/index.tsx` — homepage placeholder ("APP_NAME, coming
  soon").
- `src/routes/privacy.tsx` — placeholder, real content in PRD for
  Phase 8.
- `src/routes/terms.tsx` — placeholder.
- `src/routes/app.tsx` — placeholder app shell ("you're in the app").
- An `APP_NAME` constant in `src/constants.ts` (single source of
  truth per `DESIGN.md` §14i).
- `.env.example` updated with `BASE_PATH=` and any client-side
  Supabase vars referenced by the bootstrap (none yet — Supabase
  client comes in Phase 1).

**Out:**
- `/app/*` deep-link 404 fallback (PRD-09).
- Theme toggle / CSS custom properties (PRD-10).
- Any Supabase client wiring (Phase 1).
- Real CSS / styling beyond what's required to render readable text.

## Touched files / new files

- `package.json`, `pnpm-lock.yaml` — new.
- `tsconfig.json` — new.
- `app.config.ts` — new.
- `src/entry-server.tsx`, `src/entry-client.tsx`, `src/app.tsx` — new.
- `src/routes/index.tsx`, `privacy.tsx`, `terms.tsx`, `app.tsx` — new.
- `src/constants.ts` — new (APP_NAME placeholder).
- `.env.example` — updated.

## Data model impact

None.

## UI behavior

- All four routes render placeholder text and a heading using
  `APP_NAME`.
- No theme yet (PRD-10).
- No client routing inside `/app/*` yet beyond what SolidStart gives
  for free.

## Verification

1. `pnpm install` succeeds.
2. `pnpm dev` serves the four routes locally without errors.
3. `pnpm build` succeeds and emits a static `dist/` (or
   `.output/public/`) tree.
4. `pnpm typecheck` and `pnpm lint` exit 0.
5. `BASE_PATH=/coupons-beta pnpm build` produces output where asset
   URLs are prefixed with `/coupons-beta/` (deploy-target awareness).
6. `grep -r APP_NAME src/` shows the constant referenced by every
   route that displays it (no hard-coded duplicate strings).

**Unit tests (Dev):**
- Smoke test: each route component renders without throwing.

**QA suite:**
- Verify `APP_NAME` change in `src/constants.ts` propagates to all
  four pages on next render.
- Verify build output is static-only (no server runtime artifacts);
  `.output/server/` should be empty or absent.

## Open questions

- Exact pnpm script names: pick what's idiomatic for SolidStart in
  the version installed at execution time.
- Linter choice: ESLint is the default; pick whatever the SolidStart
  template scaffolds, or add ESLint if it scaffolds nothing.

## Dev notes

- Used the current SolidStart package `@solidjs/start` 1.3.2 (the older
  `solid-start` package name is deprecated). Router `@solidjs/router`,
  `vinxi` 0.5.11, `solid-js` 1.9.13.
- `app.config.ts`: `preset: "static"`, `baseURL`/`vite.base` from
  `BASE_PATH` env (default `/`), and an explicit
  `prerender.routes: ["/", "/privacy", "/terms", "/app"]` with
  `crawlLinks`. Without the explicit list the crawler only found `/`
  (no inter-page links yet), so the other three weren't emitted.
- `src/entry-server.tsx` HTML shell renders `<base href>` from
  `import.meta.env.BASE_URL` and has an empty theme-init comment slot
  for PRD-10.
- `APP_NAME` in `src/constants.ts`; all four routes import it (no
  duplicated literals).
- Tests: Vitest + `@solidjs/testing-library` (`vitest.config.ts`,
  `vitest.setup.ts`). `tests/unit/routes.test.tsx` smoke-tests all four
  route components render with `APP_NAME`. `pnpm test` → 4/4 pass.
- Lint: ESLint 9 flat config (`eslint.config.js`) with
  `typescript-eslint` + `eslint-plugin-solid`. `pnpm lint` clean.
- `.env.example` updated with `BASE_PATH=/`.

### Deviations / notes for QA

- Added `@types/node` (dev dep) + `"node"` in tsconfig `types` — the
  `process.env.BASE_PATH` read in `app.config.ts` needs it. TypeScript
  pinned `~5.7.3`.
- Dependency versions are pinned to **mature** releases (some pinned
  exact: `solid-js 1.9.13`, `vitest 4.1.9`) because this environment's
  pnpm enforces a `minimumReleaseAge` supply-chain policy that blocks
  packages published in the last ~14 days.
- `pnpm-workspace.yaml` contains `allowBuilds: { esbuild: true,
  '@parcel/watcher': true }` — required because pnpm here runs with
  `strictDepBuilds`, which makes un-approved native build scripts
  (esbuild) a hard error. esbuild must build or `vinxi build` fails.
- Verification results: `pnpm install` ✓; `pnpm dev` serves `/`,
  `/privacy`, `/terms`, `/app` (all 200) ✓; `pnpm build` emits static
  `.output/public` with an `index.html` per route ✓; `.output/server`
  is absent (static-only) ✓; `pnpm typecheck` and `pnpm lint` exit 0 ✓;
  `BASE_PATH=/coupons-beta/ pnpm build` prefixes asset URLs and
  `<base href>` with `/coupons-beta/` ✓.
