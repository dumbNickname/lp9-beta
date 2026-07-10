#!/usr/bin/env bash
# Install the Supabase CLI binary, pinned version, user-local install (no sudo).
# Idempotent: re-running detects matching version and skips.
#
# Bump version: change PINNED_VERSION + PINNED_SHA256 below.
# Find newest: https://github.com/supabase/cli/releases
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

PINNED_VERSION="2.103.0"
PINNED_SHA256="1eaeee74576b2b296c9731ed729c38ec91f48096be7c10290e324888a310ded7"

require_linux_x86_64
ensure_install_bin
require_cmd curl  "install via your package manager" || exit 1
require_cmd tar   "install via your package manager" || exit 1

target_bin="$INSTALL_BIN/supabase"

if [ -x "$target_bin" ]; then
  current="$("$target_bin" --version 2>/dev/null | awk '{print $1}' || true)"
  if [ "$current" = "$PINNED_VERSION" ]; then
    log_ok "supabase CLI already at pinned version $PINNED_VERSION"
    exit 0
  fi
  log_info "supabase CLI present at $current; replacing with $PINNED_VERSION"
fi

asset="supabase_${PINNED_VERSION}_linux_amd64.tar.gz"
url="https://github.com/supabase/cli/releases/download/v${PINNED_VERSION}/${asset}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

log_info "Downloading $asset"
curl -fsSL "$url" -o "$tmp/$asset"

log_info "Verifying checksum"
sha256_check "$tmp/$asset" "$PINNED_SHA256"

log_info "Extracting"
tar -xzf "$tmp/$asset" -C "$tmp"

if [ ! -f "$tmp/supabase" ]; then
  log_error "Expected 'supabase' binary not found in archive"
  exit 1
fi

install -m 0755 "$tmp/supabase" "$target_bin"
log_ok "Installed supabase CLI $PINNED_VERSION to $target_bin"

# Recent releases ship `supabase` as a thin shim that forwards to a
# sibling `supabase-go` binary. Commands like `supabase init` fail
# without it (only `--version` works on the shim alone). Install it
# alongside so the CLI is fully functional.
if [ -f "$tmp/supabase-go" ]; then
  install -m 0755 "$tmp/supabase-go" "$INSTALL_BIN/supabase-go"
  log_ok "Installed supabase-go backend to $INSTALL_BIN/supabase-go"
fi

"$target_bin" --version
