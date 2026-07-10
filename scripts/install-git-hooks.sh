#!/usr/bin/env bash
# Install this repo's git hooks into .git/hooks.
#
# Idempotent: overwrites the managed hook each run. Called by
# scripts/install-toolchain.sh, but safe to run standalone.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
HOOKS_SRC="$SCRIPT_DIR/git-hooks"
HOOKS_DST="$REPO_ROOT/.git/hooks"

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "[git-hooks] $REPO_ROOT is not a git working tree; skipping." >&2
  exit 1
fi

mkdir -p "$HOOKS_DST"
for hook in "$HOOKS_SRC"/*; do
  name="$(basename "$hook")"
  cp "$hook" "$HOOKS_DST/$name"
  chmod +x "$HOOKS_DST/$name"
  echo "[git-hooks] installed $name"
done
