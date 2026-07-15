# AGENTS.md — root DOX rail

# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

---

# Project

Couples appreciation web app. Partners give each other **hearts** with a
short encrypted comment; hearts become a spendable balance redeemable
against mutually-approved **coupons**. Product principle: train people
to notice and verbalize appreciation — nothing should feel transactional
or like a scoreboard.

The product name is not chosen yet; code uses the `APP_NAME` constant
(`src/constants.ts`) and the repo/`BASE_PATH` use the `lp9-beta`
placeholder. See `DESIGN.md` §14i.

## Source-of-truth docs

- `DESIGN.md` — every locked design decision (the *why*). Authoritative.
- `HANDOFF.md` — phased roadmap (Phase 0–10). Strategic; where it
  disagrees with `DESIGN.md` §16, `DESIGN.md` wins.
- `PROGRESS.md` — single source of truth for PRD status.
- `NEXT_SESSION.md` — orientation for resuming work.
- `prds/PRD-NN-*.md` — one tiny PRD per behavior; the executable unit.
- `LICENSE` (AGPL-3.0-or-later), `TRADEMARK.md` — legal.

These predate DOX and remain authoritative for their content. AGENTS.md
files add operational contracts; they do not replace `DESIGN.md`.

## Tech stack (locked)

- SolidJS + SolidStart + Vinxi, TypeScript strict, pnpm.
- Static SSG for public pages; SPA for `/app/*`. Hosted on GitHub Pages
  with `BASE_PATH` sub-path handling.
- Supabase (Postgres + Auth + RLS), EU region `eu-central-1` (Frankfurt).
- Vitest + `@solidjs/testing-library` for tests; ESLint 9 flat config.

## Global workflow rules

- **One PRD at a time.** Read the PRD + `DESIGN.md` + `PROGRESS.md`
  before touching code. On PRD ambiguity, stop and load `grill-me`.
- **Feature branches + squash merges to `master`.** Branch name
  `feat/PRD-NN-slug` or `fix/slug`. Never push to `master` directly once
  branch protection is on. Keep the branch stack linear; merge stable
  work promptly, don't accumulate open PRs.
- **Update `PROGRESS.md`** as PRDs move `todo → in-progress → dev-done →
  qa-done → merged`. Append `## Dev notes` to a PRD on completion.
- **Secrets never enter the repo.** `.env` is gitignored; a gitleaks
  pre-commit hook blocks leaks. Only `VITE_`-prefixed public values ship
  in the browser bundle. See `DESIGN.md` §16g.
- **Schema changes only via `supabase/migrations/`** — never click-ops.
- **No emojis in code/files** unless the user asks.

## Environment gotchas (learned; keep current)

- **Node ≥ 22.13 required** — pnpm 11 refuses older Node (`node:sqlite`
  builtin). CI (`.github/workflows/deploy.yml`) pins Node 22. Local dev
  needs the same.
- **pnpm supply-chain policies are active in this environment:**
  - `minimumReleaseAge` (~14 days) blocks freshly-published packages.
    Pin dependencies to mature versions; some are pinned exact in
    `package.json` (`solid-js`, `vitest`) for this reason.
  - `strictDepBuilds` makes un-approved native build scripts a hard
    error. `pnpm-workspace.yaml` allows `esbuild` + `@parcel/watcher`;
    esbuild MUST build or `vinxi build` fails.
- **Supabase CLI ships as a shim** (`supabase`) that forwards to a
  sibling `supabase-go` binary; both must be installed or `supabase
  init` fails. `scripts/install-supabase-cli.sh` installs both.
- **`git rebase --continue` opens `$EDITOR`** and hangs headless; run it
  with `GIT_EDITOR=true`.
- **`gitleaks protect` entropy filter:** low-entropy fake secrets (e.g.
  `ghp_aaaa...`) do NOT trip rules. Use high-entropy strings in
  adversarial tests. "0 commits scanned" on a staged scan is normal.
- **Supabase API keys have new format (2026+):** Supabase now issues
  `sb_publishable_...` keys (replaces legacy `eyJ...` JWT anon keys).
  Both formats work with `@supabase/supabase-js` 2.x `createClient()`.
  The publishable key uses the `anon` Postgres role, same RLS behavior.
  Legacy JWT keys still work; Supabase calls them "Legacy anon,
  service_role API keys" in the dashboard.
- **Vitest 4.x has no `vi.importModule()`:** use `vi.resetModules()` +
  dynamic `import()` in `beforeEach` to test modules that throw at load
  time (e.g. env-var validation). `vi.stubEnv()` + `vi.unstubAllEnvs()`
  work for `import.meta.env`.
- **Vinxi prerender runs SSR bundle in a separate Node process** where
  `VITE_*` env vars are NOT available (they're compile-time Vite
  replacements, not runtime env). Any module imported during prerender
  must not eagerly read `import.meta.env.VITE_*` at top level — use
  lazy init (getter/proxy). `supabase.ts` uses this pattern.
- **Git remote is `beta`, not `origin`.** Push with `git push beta master`.
- **Gitleaks trips on `sb_publishable_*` test strings:** use low-entropy
  fakes like `fake-key` in test stubs, not `sb_publishable_test123`.
- **Keep git workflow simple:** branch, work, merge to master, push.
  Don't fuss over perfect history.
- **PostgREST requires explicit `.eq()` filters** even when RLS
  restricts to own rows. Without a filter, UPDATE/SELECT return 400 Bad
  Request. Always add `.eq("id", user.id)` (or equivalent) on queries.

## User preferences (durable)

- Communicate in **caveman style** (terse; drop filler, keep all
  technical substance) unless the user says otherwise.
- Merge stable branches to `master` promptly; avoid a pile of open PRs.
  Fix issues via follow-up PRs.
- Do not request out-of-workspace or wide access without explaining why;
  scope commands to the workspace.
- Record things learned on the go in the DOX docs (this framework).

## Verification

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` must all pass
  before a code PRD is `dev-done`.
- `pnpm build` emits static output to `.output/public/`; there must be
  no server runtime (`.output/server` absent) for the static preset.

## Child DOX Index

- `src/AGENTS.md` — SolidStart application code (routes, components,
  lib, styles, entry points, theming).
- `supabase/AGENTS.md` — database schema, migrations, branch-driven
  workflow.
- `scripts/AGENTS.md` — toolchain installers, git hooks, build helpers.
- `prds/AGENTS.md` — PRD authoring convention and lifecycle.
- `tests/AGENTS.md` — Dev unit tests and QA adversarial suites.
- `.github/AGENTS.md` — CI/CD workflows.
- `.opencode/agent/` — Dev/QA subagent contracts (`dev.md`, `qa.md`);
  not an AGENTS.md but the authoritative agent-role definitions.
