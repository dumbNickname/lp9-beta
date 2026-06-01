#!/usr/bin/env bash
# Shared helpers for toolchain scripts. Sourced by install-*.sh and verify-toolchain.sh.
# No `set -e` here; sourcing scripts decide their own error mode.

# Colors only when stdout is a TTY.
if [ -t 1 ]; then
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
  C_BLUE=$'\033[34m'; C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_BOLD=""; C_RESET=""
fi

log_info()  { printf "%s[i]%s %s\n" "$C_BLUE"   "$C_RESET" "$*"; }
log_ok()    { printf "%s[ok]%s %s\n" "$C_GREEN" "$C_RESET" "$*"; }
log_warn()  { printf "%s[warn]%s %s\n" "$C_YELLOW" "$C_RESET" "$*" >&2; }
log_error() { printf "%s[err]%s %s\n" "$C_RED"  "$C_RESET" "$*" >&2; }

# Where we install user-local binaries. Must be in PATH.
INSTALL_BIN="${INSTALL_BIN:-$HOME/.local/bin}"

ensure_install_bin() {
  mkdir -p "$INSTALL_BIN"
  case ":$PATH:" in
    *":$INSTALL_BIN:"*) : ;;
    *) log_warn "$INSTALL_BIN is not in \$PATH. Add: export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
  esac
}

# Check we're on a supported platform. Extend later as needed.
require_linux_x86_64() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  if [ "$os" != "Linux" ] || [ "$arch" != "x86_64" ]; then
    log_error "Unsupported platform: $os/$arch. Scripts target Linux x86_64 only."
    exit 1
  fi
}

# Require a command to exist; print install hint if not.
require_cmd() {
  local cmd="$1" hint="${2:-}"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_error "Required command missing: $cmd${hint:+ — $hint}"
    return 1
  fi
}

# sha256_check <file> <expected_hex>
sha256_check() {
  local file="$1" expected="$2" actual
  actual="$(sha256sum "$file" | awk '{print $1}')"
  if [ "$actual" != "$expected" ]; then
    log_error "Checksum mismatch for $file"
    log_error "  expected: $expected"
    log_error "  actual:   $actual"
    return 1
  fi
}

# fetch_latest_github_tag <owner/repo> -> prints tag like "v1.2.3" (or empty on failure)
fetch_latest_github_tag() {
  local repo="$1"
  curl -fsSL --max-time 10 "https://api.github.com/repos/${repo}/releases/latest" 2>/dev/null \
    | grep -oE '"tag_name":[[:space:]]*"[^"]+"' \
    | head -1 \
    | sed -E 's/.*"([^"]+)"$/\1/'
}

# Compare two semver-ish versions (strip leading v). Returns:
#   0 if equal, 1 if $1 > $2, 2 if $1 < $2.
version_cmp() {
  local a="${1#v}" b="${2#v}"
  if [ "$a" = "$b" ]; then return 0; fi
  local newest
  newest="$(printf '%s\n%s\n' "$a" "$b" | sort -V | tail -1)"
  if [ "$newest" = "$a" ]; then return 1; else return 2; fi
}
