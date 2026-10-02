# scripts/AGENTS.md

## Purpose

Toolchain installers, git hooks and build helpers. Bash, user-local
(no sudo), Linux x86_64.

## Ownership

Owns the scripts folder, including the shared helper library the other
scripts source.

## Local Contracts

- One entry point installs a fresh dev machine: checks prerequisites,
  installs Supabase CLI, gitleaks and git hooks, then verifies.
- The Supabase CLI install must place both the shim and its sibling
  binary, or every real command fails.
- Pinned binaries carry a version and checksum; bump both together
  (§16h).
- The pre-commit hook runs gitleaks on staged changes; `--no-verify` is
  the documented escape hatch.
- The post-build step copies the shell to `404.html` so GitHub Pages
  deep links into `/app` work (§11b).
- The verify script is read-only.

## Work Guidance

- Linux x86_64 only; extend platforms only when asked.

## Verification

- The verify script reports installed vs pinned versions and fails if
  anything required is missing or too old.

## Child DOX Index

- None.
