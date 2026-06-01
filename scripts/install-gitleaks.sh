#!/usr/bin/env bash
# Install the gitleaks binary, pinned version, user-local install (no sudo).
# Used as a pre-commit hook to prevent secret leakage into git history.
#
# Bump version: change PINNED_VERSION + PINNED_SHA256 below.
# Find newest: https://github.com/gitleaks/gitleaks/releases
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

PINNED_VERSION="8.30.1"
PINNED_SHA256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"

require_linux_x86_64
ensure_install_bin
require_cmd curl "install via your package manager" || exit 1
require_cmd tar  "install via your package manager" || exit 1

target_bin="$INSTALL_BIN/gitleaks"

if [ -x "$target_bin" ]; then
  current="$("$target_bin" version 2>/dev/null | head -1 || true)"
  if [ "$current" = "v${PINNED_VERSION}" ] || [ "$current" = "$PINNED_VERSION" ]; then
    log_ok "gitleaks already at pinned version $PINNED_VERSION"
    exit 0
  fi
  log_info "gitleaks present at '$current'; replacing with $PINNED_VERSION"
fi

asset="gitleaks_${PINNED_VERSION}_linux_x64.tar.gz"
url="https://github.com/gitleaks/gitleaks/releases/download/v${PINNED_VERSION}/${asset}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

log_info "Downloading $asset"
curl -fsSL "$url" -o "$tmp/$asset"

log_info "Verifying checksum"
sha256_check "$tmp/$asset" "$PINNED_SHA256"

log_info "Extracting"
tar -xzf "$tmp/$asset" -C "$tmp"

if [ ! -f "$tmp/gitleaks" ]; then
  log_error "Expected 'gitleaks' binary not found in archive"
  exit 1
fi

install -m 0755 "$tmp/gitleaks" "$target_bin"
log_ok "Installed gitleaks $PINNED_VERSION to $target_bin"

"$target_bin" version
