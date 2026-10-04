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
short encrypted note; hearts become a balance spent on mutually-approved
**wishes** (coupons). Principle: train people to notice and say
appreciation; nothing transactional, no scoreboard.

The product name is not chosen yet (placeholder `APP_NAME`, repo and
sub-path `lp9-beta`; `DESIGN.md` §14i).

## Source-of-truth docs

- `DESIGN.md` — locked decisions and the why. Authoritative.
- `PROGRESS.md` — PRD status. `prds/` — one small PRD per behaviour.
- `NEXT_SESSION.md` — where to resume.
- `WORKLOG.md` — autonomous sessions: brief, findings, decisions, what
  the owner should look at.
- `no-human-decisions.md` — agent choices awaiting owner review.
- `IDEAS.md` — backlog; promote to a PRD before building.
- `REVIEW.md` — ranked review findings.
- `HANDOFF.md` — historical roadmap; loses to DESIGN/PROGRESS.
- `docs/` — owner setup guides. `LICENSE` (AGPL-3.0+), `TRADEMARK.md`.

AGENTS.md files hold operating rules; they do not replace `DESIGN.md`.
Docs describe ideas, contracts and where things live, not code lines.

## Tech stack (locked)

- SolidJS + SolidStart (Vinxi), strict TypeScript, pnpm.
- Static pages + SPA `/app` on GitHub Pages under a sub-path.
- Supabase (Postgres, anonymous auth, RLS, Edge Functions), EU
  Frankfurt.
- Vitest + Solid testing library; ESLint flat config.

## Global workflow rules

- One PRD at a time; read it with `DESIGN.md` and `PROGRESS.md`. On
  ambiguity, ask (grill-me) instead of guessing.
- Solo-owner practice: small changes go straight to `master` and are
  pushed; CI gates the deploy. Switch to branches + PRs once branch
  protection is on.
- Before every commit: typecheck, lint, test. Tests do not typecheck;
  a type error once passed tests and silently skipped a deploy.
- Secrets never enter the repo; only public `VITE_` values reach the
  browser (§16g). Schema changes only via migrations.
- No emojis in code/docs (wish templates are product content).
- Verify on the live site after each deploy with a browser E2E using
  two or three anonymous users; it catches what unit tests miss.
- The agent cannot view images: assert layout via DOM and computed
  styles (boxes, contrast, real clicks for overlays) and tell the owner
  what to look at.
- Record decisions where they belong: product rules as dated
  amendments in `DESIGN.md`; agent choices in `no-human-decisions.md`;
  ideas in `IDEAS.md`; session story in `WORKLOG.md`. Other docs stay
  undated.
- Every bug found in E2E gets a regression test.

## Product/engineering lessons (keep current)

- **Background tabs freeze timers.** Cross-device handshakes (pairing)
  must also complete on focus/refresh, not only on a poll.
- **Unmounting on "loading" loses state.** Gate on first load only; key
  remounts by stable ids, not refetched objects.
- **Overlays that float over content block real use.** Hints sit in the
  flow and appear only where relevant.
- **One-shot URL inputs** (invite fragments) are captured once at app
  start and held in memory.
- **Postgres grants EXECUTE to PUBLIC** on new functions; revoke on
  helpers. Prefer no write policies + definer RPCs.
- **PostgREST** needs explicit filters even under RLS, and returns
  `bytea` as `\x` hex. RPC errors are plain `{ message }` objects, not
  `Error`s: read the message via the shared data-layer helper, and mock
  that shape in tests.

## Environment gotchas

- Node ≥ 22.13 (pnpm 11); CI pins 22. This machine has two Nodes: a
  preinstalled one (22.8, too old) that plain shells pick up, and an
  nvm Node (default 24) that carries pnpm. Every shell must load nvm
  before pnpm/node; if `node -v` shows 22.8 or pnpm is "not found",
  nvm was not loaded. pnpm lives per nvm Node version: switching
  versions means reinstalling pnpm.
- pnpm policies: minimum release age (pin mature versions) and strict
  build scripts (esbuild must be allowed).
- Supabase CLI needs both the shim and its sibling binary (installer
  script handles it). Never `db push`/`link` locally.
- Supabase free tier pauses after ~1 week idle (DNS fails); after
  restore expect a few minutes of 502s and a stale schema cache.
- Supabase keys: new `sb_publishable_` and legacy JWT both work.
- Edge Functions deploy only when declared in the Supabase config;
  their secrets live in the dashboard.
- Prerender runs without `VITE_*` env: never read them at module load.
- Git remote is `beta`; `git rebase --continue` needs `GIT_EDITOR=true`.
- Gitleaks: low-entropy fakes don't trip it; high-entropy fixtures need
  an inline allow marker; publishable-looking test strings trip it.
- Tests: no `indexedDB` in jsdom (use fake-indexeddb, fresh per test);
  modules that throw at load need reset + dynamic import; portal UI is
  outside the render container (query the screen).
- Solid hydration can leave reactive attributes stale on SSR'd nodes;
  write them in an effect.
- Static `public/` files land under the sub-path; use relative URLs.
- Local E2E: don't use the dev server (it reloads mid-run). Build with
  the sub-path, run the post-build step, serve the output with a simple
  static server under the sub-path, drive two browser contexts with
  playwright-core and the cached Chromium. Helpers live in a temp dir
  and vanish on restart; recreate as needed.
- Builds can exceed the tool timeout: clear the output dir first (a
  failed build leaves the old bundle), run detached with a log and an
  exit-code marker, confirm new code is in the bundle.
- Never `pkill -f <pattern>` in the same command as other work; the
  pattern matches the shell itself. Check with `pgrep -fa` first.
- Keep subagent tasks small (~10 min); big scopes time out.
- Throwaway live smoke scripts stay outside the repo (they create real
  anonymous users).
- Rewriting pushed history only with owner OK and force-with-lease.

## User preferences (durable)

- Caveman style (terse, full substance) unless told otherwise.
- Load `caveman`, `pragmatic` and `grill-me` at session start.
- Mobile first; strong visuals over text; vary type and colour so
  screens don't read as one block of text.
- Ask before acting on ambiguity; then work autonomously and log
  decisions.
- Docs concise: ideas and contracts, no file/line references.
- Explain any out-of-workspace access before requesting it.
- Write files in small chunks (the write tool fails on big files).

## Verification

- Typecheck, lint, tests and build pass before work is `dev-done`.
- Build output is fully static (no server runtime).

## Child DOX Index

- `src/AGENTS.md` — the web app: platform rules, look and feel,
  pairing, privacy mode, app shell.
- `supabase/AGENTS.md` — schema, migrations, RPC/RLS rules, push.
- `scripts/AGENTS.md` — toolchain installers, git hooks, build helpers.
- `prds/AGENTS.md` — PRD convention and lifecycle.
- `tests/AGENTS.md` — unit and QA adversarial suites.
- `.github/AGENTS.md` — CI/CD and Pages deploy.
- `.opencode/agent/` — Dev/QA subagent role definitions.
