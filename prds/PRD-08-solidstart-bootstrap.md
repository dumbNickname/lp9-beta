# PRD-08 — SolidStart + Vinxi bootstrap

> Status: see `PROGRESS.md`.

## Goal

Stand up a minimal SolidStart + Vinxi project at repo root that builds
to a fully static site serving the four placeholder routes the design
calls for: `/`, `/privacy`, `/terms`, `/app`.

## What shipped

- SolidStart (current `@solidjs/start` package; old `solid-start` name
  is deprecated) + Vinxi + `@solidjs/router`, strict TypeScript, pnpm.
  Scripts: dev, build, preview, lint, typecheck, test.
- Static preset with an explicit prerender list for the four routes
  (the link crawler alone only found `/`).
- Sub-path aware: `BASE_PATH` env (default `/`) sets the build base, so
  asset URLs and the HTML shell's `<base href>` carry the sub-path.
- HTML shell with an empty theme-init slot (filled by PRD-10).
- Client router enabled for SPA navigation inside `/app` (§11b).
- `APP_NAME` is a single constant (§14i); every route imports it, no
  duplicated literals.
- Tooling: Vitest + Solid testing library; ESLint flat config with
  typescript-eslint and the Solid plugin.
- Out: `/app/*` 404 fallback (PRD-09), theme (PRD-10), Supabase client
  (Phase 1), styling beyond readable text.

## Decisions

- Open choices settled by Dev: idiomatic SolidStart script names; ESLint
  added since the template scaffolds none.

## Verification

- Install, dev, build, typecheck, lint pass; smoke test renders each
  route with `APP_NAME`.
- Build emits one `index.html` per route and no server output
  (static-only).
- Sub-path build prefixes asset URLs and `<base href>` correctly.

## Gotchas

- pnpm minimum-release-age policy: pin mature versions.
- pnpm strict dep builds: esbuild must be allowed to build or the build
  fails.
- Reading `BASE_PATH` from the process env in the app config needs Node
  types in tsconfig.
- Prerender runs without `VITE_*` env: never read them at module load.

## Later changes

- Node >= 22.13 required locally (pnpm 11); CI pins Node 22 (root
  AGENTS.md).
- Deployed sub-path is `lp9-beta` (PRD-09); the original example used a
  different name.
