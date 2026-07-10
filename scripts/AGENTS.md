# scripts/AGENTS.md

## Purpose

Toolchain installers, git hooks, and build helpers. Bash, user-local (no
sudo), Linux x86_64.

## Ownership

Owns `scripts/`. `scripts/lib.sh` holds shared helpers (logging,
checksum, version compare, platform guard) sourced by the others.

## Local Contracts

- **`install-toolchain.sh` is the single entry point** for a fresh dev
  machine. It checks prerequisites (node, pnpm, git, curl, tar), then
  runs `install-supabase-cli.sh`, `install-gitleaks.sh`,
  `install-git-hooks.sh`, then `verify-toolchain.sh`.
- **`install-supabase-cli.sh` must install BOTH `supabase` and
  `supabase-go`.** The release tarball ships `supabase` as a shim that
  forwards to the sibling `supabase-go`; installing only `supabase`
  makes every non-`--version` command (e.g. `supabase init`) fail.
- **Pinned binaries** carry `PINNED_VERSION` + `PINNED_SHA256`; bump both
  together and re-run the installer (`DESIGN.md` §16h).
- **`install-git-hooks.sh`** copies `scripts/git-hooks/*` into
  `.git/hooks` and marks them executable. The `pre-commit` hook runs
  `gitleaks protect --staged --redact --config .gitleaks.toml`;
  `--no-verify` is the documented escape hatch.
- **`post-build.sh`** copies `.output/public/index.html` → `404.html`
  for the GH Pages SPA deep-link fallback (`DESIGN.md` §11b). Run after
  `pnpm build` in CI.
- `verify-toolchain.sh` is **read-only**.

## Work Guidance

- Scripts target Linux x86_64; guard with `require_linux_x86_64`. Extend
  platform support only when asked.

## Verification

- `bash scripts/verify-toolchain.sh` reports installed vs pinned vs
  latest versions and exits non-zero if anything required is missing or
  too old.

## Child DOX Index

- None.
