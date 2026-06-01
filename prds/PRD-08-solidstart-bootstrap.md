# PRD-08 — SolidStart + Vinxi bootstrap

## Goal

Stand up a minimal SolidStart + Vinxi project at repo root that builds
to a static site and serves the four placeholder routes the design
calls for: `/`, `/privacy`, `/terms`, `/app`.

## Scope

**In:**
- `package.json` with: solid-js, solid-start, vinxi, typescript (strict),
  pnpm as package manager, scripts: `dev`, `build`, `preview`, `lint`,
  `typecheck`. Mirror m-tynki's `solid-site/package.json` for versions
  where reasonable.
- `app.config.ts` with `preset: "static"` and `BASE_PATH` handling
  (m-tynki §"Base Path Handling" pattern). `BASE_PATH` reads from env.
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
  We intentionally do NOT copy m-tynki's CSS (`DESIGN.md` "Reference
  project" note).

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
- Verify NO m-tynki CSS / class names / component code copied
  verbatim into this repo (grep for telltale m-tynki identifiers).
- Verify `APP_NAME` change in `src/constants.ts` propagates to all
  four pages on next render.
- Verify build output is static-only (no server runtime artifacts);
  `.output/server/` should be empty or absent.

## Open questions

- Exact pnpm script names: align with m-tynki for muscle memory.
- Linter choice: ESLint is the default; if m-tynki uses something
  else, match it. Decided at execution time.
