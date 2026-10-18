# lp9

> A small web app that helps a couple notice, name, and reward the
> appreciation that day-to-day life would otherwise leave unsaid: one
> partner gives the other "hearts" with a short encrypted comment, hearts
> become a spendable balance, and the balance can be redeemed against
> coupons each partner has approved on the other's wishlist.

**The product is called Endeary** ([`DESIGN.md`](./DESIGN.md) §14).
Each build sets the shown name ("Endeary", "Endeary beta") through one
`APP_NAME` constant.

## Status

**Beta.** The app works end to end for anonymous couples (pairing,
encrypted notes, hearts, wishes, claims, push). Not launched: privacy
and legal pages and the homepage are still to come; production at
`endeary.com` is being set up.

What's being built and where each PRD stands lives in
[`PROGRESS.md`](./PROGRESS.md).

## License & brand — please read

This project separates two things that are commonly conflated: the
**code** (governed by an open-source license) and the **brand**
(governed by trademark). Both apply, independently and simultaneously.

- **Code:** licensed under the **GNU Affero General Public License,
  version 3.0 or later** (`AGPL-3.0-or-later`). Full text in
  [`LICENSE`](./LICENSE). In short: you may fork, modify, and run the
  code, including as a network-accessible service, **provided** you
  publish your modifications under the same license. The AGPL §13
  network-use clause closes the SaaS loophole that plain GPL leaves
  open.
- **Name & logo:** **not** covered by the AGPL. They are the
  unregistered ("common law") trademarks of the project's owner,
  pending formal registration. See [`TRADEMARK.md`](./TRADEMARK.md) for
  the full notice, including what forks must do (rename before
  redistributing) and what nominative use is permitted without asking.

The full rationale for this split — why AGPL and not MIT / GPL / BSL,
why a separate trademark file rather than relying on the license — is
in [`DESIGN.md`](./DESIGN.md) §17.

## Where to look next

| File | What it is |
|------|------------|
| [`DESIGN.md`](./DESIGN.md) | Every locked-in design decision. Read this first if you want to understand what the product is and why it's shaped the way it is. |
| [`HANDOFF.md`](./HANDOFF.md) | Historical phased plan and product principles; `DESIGN.md` and `PROGRESS.md` win where they differ. |
| [`PROGRESS.md`](./PROGRESS.md) | Single source of truth for which PRDs exist, which phase they belong to, and what state each one is in (`todo` / `in-progress` / `dev-done` / `qa-done` / `merged`). |
| [`prds/`](./prds/) | Per-task PRDs. Each PRD is a self-contained slice that a Dev agent can implement end-to-end and a QA agent can verify. |
| [`LICENSE`](./LICENSE) | AGPL-3.0-or-later. |
| [`TRADEMARK.md`](./TRADEMARK.md) | Brand reservation notice. |
| `CONTRIBUTING.md` | **TODO** — not written yet. Contribution guidelines will land once the project is past Phase 0 and there's something meaningful to contribute to. |

## Local setup

### Prerequisites

You must have these already installed:

- **Node.js 22.13 or newer** (pnpm 11 requires it; older Node fails on
  the `node:sqlite` builtin). Recommended: install via
  [`nvm`](https://github.com/nvm-sh/nvm) — `nvm install --lts`
- **pnpm 9 or newer** (recommended: `corepack enable && corepack
  prepare pnpm@latest --activate`)
- **git 2.30 or newer**
- **`curl`** and **`tar`** (typically already present on Linux / macOS;
  install via your distro's package manager if not)

### Install the rest of the toolchain

From the repo root:

```bash
bash scripts/install-toolchain.sh
```

This installs, user-local (no `sudo`), pinned versions of:

- the [Supabase CLI](https://github.com/supabase/cli)
- [`gitleaks`](https://github.com/gitleaks/gitleaks) (used by the
  pre-commit secret-scanning hook that lands in PRD-06)

The installer is idempotent: re-running it is safe.

> The installer currently targets Linux x86_64. On other platforms,
> install the Supabase CLI and `gitleaks` manually following their
> upstream instructions and then run the verification step below.

### Verify the toolchain

```bash
bash scripts/verify-toolchain.sh
```

This is read-only. It checks every required tool is present at or
above the project's minimum version, reports the installed version
alongside the latest upstream version where applicable, and exits
non-zero if anything required is missing or too old.

### Build / run

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

Other scripts: `pnpm build` (static site to `.output/public/`),
`pnpm preview`, `pnpm typecheck`, `pnpm lint`, `pnpm test`,
`pnpm deploy:beta` (build + deploy the beta Worker; see
[`docs/production-setup.md`](./docs/production-setup.md)).

`BASE_PATH` (default `/`) prefixes built asset URLs; both environments
build at `/`. `VITE_APP_NAME` sets the shown name.

For the database workflow (migrations, the branch-driven Supabase
GitHub integration, and where the project URL / anon key come from),
see [`supabase/README.md`](./supabase/README.md).

## Deployment

One repo ([`dumbNickname/lp9-beta`](https://github.com/dumbNickname/lp9-beta)),
two environments ([`DESIGN.md`](./DESIGN.md) §16e-§16f, PRD-57):

| | Beta | Production |
|---|---|---|
| Branch | `master` | `release` (fast-forward from `master`) |
| Site | Cloudflare Worker `endeary-beta.<account>.workers.dev` | GitHub Pages, `endeary.com` |
| Supabase | beta project (previews on PRs) | prod project |
| Name shown | Endeary beta | Endeary |

`.github/workflows/deploy.yml` runs gitleaks, typecheck, lint and tests
on every push and PR, then deploys beta (push to `master`) or
production (push to `release`). Both sites are `noindex` until launch.
The beta Worker also runs a daily keep-alive so neither free Supabase
project pauses.

Owner setup (Cloudflare, Supabase, GitHub, OVH DNS):
[`docs/production-setup.md`](./docs/production-setup.md).

## Credits

**TODO** — author / maintainer credits will be added here once the
brand is resolved (see [`DESIGN.md`](./DESIGN.md) §14).
