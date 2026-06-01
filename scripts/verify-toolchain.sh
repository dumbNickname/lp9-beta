#!/usr/bin/env bash
# Verify the local toolchain matches what this project needs.
# Reports installed versions and whether a newer upstream version exists.
# Read-only: never installs or upgrades anything.
#
# Exit code: 0 if all required tools present at >= minimum version, 1 otherwise.
set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

# ---- Required minimums for this project. -----------------------------------
# These are floors; pinned installer versions in install-*.sh may be higher.
MIN_NODE="20.0.0"
MIN_PNPM="9.0.0"
MIN_GIT="2.30.0"

# Pinned versions (must match install-*.sh PINNED_VERSION).
PINNED_SUPABASE="2.103.0"
PINNED_GITLEAKS="8.30.1"
# ----------------------------------------------------------------------------

fail=0

check_tool() {
  # check_tool <name> <cmd> <version-extract-pipeline> <minimum-or-empty> <github-repo-or-empty> <pinned-or-empty>
  local name="$1" cmd="$2" extract="$3" minimum="$4" repo="$5" pinned="$6"

  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_error "$name: NOT INSTALLED"
    fail=1
    return
  fi

  local installed
  installed="$(bash -c "$extract" 2>/dev/null || true)"
  installed="${installed#v}"

  if [ -z "$installed" ]; then
    log_warn "$name: installed but version could not be parsed"
    return
  fi

  local status="$installed"

  if [ -n "$minimum" ]; then
    if version_cmp "$installed" "$minimum"; then
      :  # equal, fine
    elif [ $? -eq 1 ]; then
      :  # installed > minimum, fine
    else
      log_error "$name: $installed (below required minimum $minimum)"
      fail=1
      return
    fi
  fi

  if [ -n "$pinned" ]; then
    if [ "$installed" != "$pinned" ]; then
      log_warn "$name: $installed (project pins $pinned — re-run install script to align)"
      # not a hard fail; pinned drift is informational
    fi
  fi

  if [ -n "$repo" ]; then
    local latest
    latest="$(fetch_latest_github_tag "$repo")"
    latest="${latest#v}"
    if [ -n "$latest" ]; then
      if version_cmp "$installed" "$latest"; then
        log_ok "$name: $installed (latest)"
      elif [ $? -eq 1 ]; then
        log_ok "$name: $installed (ahead of upstream $latest)"
      else
        log_warn "$name: $installed — newer upstream $latest available"
        if [ -n "$pinned" ]; then
          log_warn "  to upgrade: bump PINNED_VERSION in scripts/install-${cmd}-cli.sh, refresh PINNED_SHA256, re-run scripts/install-toolchain.sh"
        fi
      fi
    else
      log_ok "$name: $installed (upstream check skipped — offline?)"
    fi
  else
    log_ok "$name: $installed"
  fi
}

printf "%sToolchain check%s\n" "$C_BOLD" "$C_RESET"
printf "Install root: %s\n\n" "$INSTALL_BIN"

check_tool "node"     "node"     "node --version"           "$MIN_NODE" "" ""
check_tool "pnpm"     "pnpm"     "pnpm --version"           "$MIN_PNPM" "" ""
check_tool "git"      "git"      "git --version | awk '{print \$3}'" "$MIN_GIT" "" ""
check_tool "supabase" "supabase" "supabase --version | head -1 | awk '{print \$1}'" "" "supabase/cli"          "$PINNED_SUPABASE"
check_tool "gitleaks" "gitleaks" "gitleaks version | head -1"                       "" "gitleaks/gitleaks"     "$PINNED_GITLEAKS"

echo
if [ "$fail" -eq 0 ]; then
  log_ok "Toolchain OK"
  exit 0
else
  log_error "Toolchain has missing/below-minimum tools — see above"
  exit 1
fi
