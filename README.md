# `APP_NAME`

> A small web app that helps a couple notice, name, and reward the
> appreciation that day-to-day life would otherwise leave unsaid: one
> partner gives the other "hearts" with a short encrypted comment, hearts
> become a spendable balance, and the balance can be redeemed against
> coupons each partner has approved on the other's wishlist.

**`APP_NAME` is a placeholder.** A final product name has not been
chosen yet. See [`DESIGN.md`](./DESIGN.md) §14 for the (deferred)
naming decision and the verification checklist that gates it. Until a
name is locked in, code and copy refer to the product as `APP_NAME` so
a global rename stays cheap.

## Status

**Pre-MVP. Design phase.** No public product exists yet, no
`package.json`, no Supabase project, no deployed site. The repository
currently contains design documents, license + trademark notices, the
phased implementation plan, individual PRDs for the work in flight, and
the toolchain installer that bootstraps a fresh dev machine.

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
| [`HANDOFF.md`](./HANDOFF.md) | The phased implementation plan (Phase 0 → Phase 10) and the product principles that must inform every implementation decision. |
| [`PROGRESS.md`](./PROGRESS.md) | Single source of truth for which PRDs exist, which phase they belong to, and what state each one is in (`todo` / `in-progress` / `dev-done` / `qa-done` / `merged`). |
| [`prds/`](./prds/) | Per-task PRDs. Each PRD is a self-contained slice that a Dev agent can implement end-to-end and a QA agent can verify. |
| [`LICENSE`](./LICENSE) | AGPL-3.0-or-later. |
| [`TRADEMARK.md`](./TRADEMARK.md) | Brand reservation notice. |
| `CONTRIBUTING.md` | **TODO** — not written yet. Contribution guidelines will land once the project is past Phase 0 and there's something meaningful to contribute to. |

## Local setup

### Prerequisites

You must have these already installed:

- **Node.js 20 or newer** (recommended: install via
  [`nvm`](https://github.com/nvm-sh/nvm) — `nvm install --lts`)
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

There is no `package.json` yet. The SolidStart + Vinxi project gets
bootstrapped in PRD-08 (`prds/PRD-08-solidstart-bootstrap.md`); once
that PRD lands, `pnpm install` and `pnpm dev` will be the standard
entrypoints, and this section will be updated to reflect that.

## Deployment

The GitHub repository
[`dumbNickname/lp9-beta`](https://github.com/dumbNickname/lp9-beta) is
the **single source repo** for this project, served via GitHub Pages.
The `lp9` in that URL is a deferred-name placeholder — the same kind of
placeholder as `APP_NAME` in code — and **is not a final product name**.
It exists so the repo could be created before the naming question
is settled (see [`DESIGN.md`](./DESIGN.md) §14i). The repo will be
renamed in the GitHub dashboard once a real name is locked in; the
custom domain is wired up in Phase 10 of [`HANDOFF.md`](./HANDOFF.md).

The deploy + branching model is documented in
[`DESIGN.md`](./DESIGN.md) §16e (Supabase access via GitHub
integration) and §16f (single-repo, branch-driven environments). The
actual GitHub Actions workflow lands in PRD-09
(`prds/PRD-09-deploy-workflow.md`).

## Credits

**TODO** — author / maintainer credits will be added here once the
project's name and brand are resolved (see
[`DESIGN.md`](./DESIGN.md) §14).
