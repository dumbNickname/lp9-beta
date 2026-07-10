#!/usr/bin/env bash
# Top-level toolchain installer. Run this once on any new dev machine to set up
# everything this project needs to build, lint, and push DB migrations.
#
# What it installs (user-local, no sudo):
#   - supabase CLI (pinned)
#   - gitleaks      (pinned)
#   - git hooks     (pre-commit secret scan via gitleaks)
#
# What it assumes is already present (errors clearly if missing):
#   - node    >= 20  (recommended: install via nvm)
#   - pnpm    >= 9   (recommended: corepack enable && corepack prepare pnpm@latest --activate)
#   - git     >= 2.30
#   - curl, tar
#
# Idempotent. Re-run any time.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

printf "%s== Toolchain install ==%s\n\n" "$C_BOLD" "$C_RESET"

require_linux_x86_64
ensure_install_bin

missing=0
for cmd in node pnpm git curl tar; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_error "Prerequisite missing: $cmd"
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  cat >&2 <<'EOF'

Install the missing prerequisites first:
  - node:  https://github.com/nvm-sh/nvm  (then: nvm install --lts)
  - pnpm:  corepack enable && corepack prepare pnpm@latest --activate
  - git, curl, tar: via your distro's package manager
EOF
  exit 1
fi

bash "$SCRIPT_DIR/install-supabase-cli.sh"
echo
bash "$SCRIPT_DIR/install-gitleaks.sh"
echo

log_info "Installing git hooks"
bash "$SCRIPT_DIR/install-git-hooks.sh"
echo

log_info "Running verification"
bash "$SCRIPT_DIR/verify-toolchain.sh"
