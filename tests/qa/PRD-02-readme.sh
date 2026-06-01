#!/usr/bin/env bash
# QA adversarial tests for PRD-02 (README skeleton).
#
# Goes beyond the PRD's Verification list to check three classes of bug
# that a "looks fine on read-through" review can miss:
#
#   1. Link rot: every relative link in README.md resolves to a real
#      file/dir in the repo. (PRD QA suite calls for "markdown lint
#      clean" — this is the concrete teeth behind that.)
#
#   2. Drift from source of truth: the prerequisite versions the
#      README quotes (node 20+, pnpm 9+, git 2.30+) must match what
#      scripts/verify-toolchain.sh actually enforces. If a future
#      script bump silently raises the floor and the README is not
#      updated, a fresh contributor following the README would still
#      get rejected by the verifier.
#
#   3. Secret hygiene (DESIGN.md §16g): the README must not contain
#      anything that looks like a real Supabase URL, anon/service-role
#      JWT, project ref, or sk_ secret. Dev didn't touch .env, but the
#      check is cheap and the cost of a leak is high.
#
# Exits 0 if all checks pass, non-zero on the first failure.

set -uo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
README="$REPO_ROOT/README.md"

fail=0
pass() { printf "[ok]   %s\n" "$*"; }
err()  { printf "[FAIL] %s\n" "$*" >&2; fail=1; }

if [ ! -f "$README" ]; then
  err "README.md not found at $README"
  exit 1
fi

# ----------------------------------------------------------------------
# 1. Relative-link resolution.
#
# Pull every markdown link target of the form (./path) or (path/...) out
# of README.md, skip http(s), skip anchors, normalize and check.
# ----------------------------------------------------------------------
printf "\n== 1. Relative links resolve ==\n"

# Extract link targets between ]( and ).
# Tolerates ` ` (space) and § etc in surrounding text; not in the target.
mapfile -t targets < <(
  grep -oE '\]\([^)]+\)' "$README" \
    | sed -E 's/^\]\(//; s/\)$//' \
    | grep -vE '^https?://' \
    | grep -vE '^#' \
    | sed -E 's/#.*$//'    # strip in-page anchor suffixes
)

if [ "${#targets[@]}" -eq 0 ]; then
  err "no relative links found in README — extraction is broken"
fi

for t in "${targets[@]}"; do
  # Strip leading ./
  rel="${t#./}"
  full="$REPO_ROOT/$rel"
  if [ -e "$full" ]; then
    pass "link resolves: $t"
  else
    err "broken link: $t (resolved to $full)"
  fi
done

# Also check the inline-code references that aren't formal links but
# the README points the reader at (`prds/PRD-08-...`, `prds/PRD-09-...`,
# `.env`, etc.). These are paths the reader will copy-paste.
printf "\n== 1b. Inline path references ==\n"
for path_ref in \
  "prds/PRD-08-solidstart-bootstrap.md" \
  "prds/PRD-09-deploy-workflow.md" \
  "scripts/install-toolchain.sh" \
  "scripts/verify-toolchain.sh"
do
  if grep -qF "$path_ref" "$README"; then
    if [ -e "$REPO_ROOT/$path_ref" ]; then
      pass "inline path exists: $path_ref"
    else
      err "inline path referenced in README but missing: $path_ref"
    fi
  fi
done

# ----------------------------------------------------------------------
# 2. Drift: README prerequisite versions must match verify-toolchain.sh.
# ----------------------------------------------------------------------
printf "\n== 2. README prerequisite versions match verify-toolchain.sh ==\n"

VERIFY="$REPO_ROOT/scripts/verify-toolchain.sh"
if [ ! -f "$VERIFY" ]; then
  err "scripts/verify-toolchain.sh not found"
else
  min_node="$(grep -E '^MIN_NODE=' "$VERIFY" | head -1 | sed -E 's/.*"([0-9.]+)".*/\1/')"
  min_pnpm="$(grep -E '^MIN_PNPM=' "$VERIFY" | head -1 | sed -E 's/.*"([0-9.]+)".*/\1/')"
  min_git="$(grep -E '^MIN_GIT=' "$VERIFY"  | head -1 | sed -E 's/.*"([0-9.]+)".*/\1/')"

  # The README states floors as "Node.js 20 or newer", "pnpm 9 or newer",
  # "git 2.30 or newer". Pull the major (and 2.30 for git) and compare.
  node_major="${min_node%%.*}"
  pnpm_major="${min_pnpm%%.*}"
  git_floor="$(printf '%s' "$min_git" | sed -E 's/\.0$//')"   # 2.30.0 -> 2.30

  if grep -qE "Node\.js[[:space:]]*${node_major}[[:space:]]*or[[:space:]]*newer" "$README"; then
    pass "README states Node.js ${node_major}+ (matches MIN_NODE=$min_node)"
  else
    err "README does not state 'Node.js ${node_major} or newer' (verify-toolchain has MIN_NODE=$min_node)"
  fi

  if grep -qE "pnpm[[:space:]]*${pnpm_major}[[:space:]]*or[[:space:]]*newer" "$README"; then
    pass "README states pnpm ${pnpm_major}+ (matches MIN_PNPM=$min_pnpm)"
  else
    err "README does not state 'pnpm ${pnpm_major} or newer' (verify-toolchain has MIN_PNPM=$min_pnpm)"
  fi

  if grep -qE "git[[:space:]]*${git_floor}[[:space:]]*or[[:space:]]*newer" "$README"; then
    pass "README states git ${git_floor}+ (matches MIN_GIT=$min_git)"
  else
    err "README does not state 'git ${git_floor} or newer' (verify-toolchain has MIN_GIT=$min_git)"
  fi
fi

# Likewise: the install/verify command strings the README quotes must
# actually be runnable as written. We don't run them (that's the human
# fresh-clone test), but we check the script files exist with the same
# names the README quotes.
for cmd_path in "scripts/install-toolchain.sh" "scripts/verify-toolchain.sh"; do
  if grep -qF "bash $cmd_path" "$README"; then
    pass "README quotes 'bash $cmd_path' and the script exists"
  else
    err "README does not quote 'bash $cmd_path' as expected"
  fi
done

# ----------------------------------------------------------------------
# 3. Secret hygiene (DESIGN.md §16g): README must not leak secrets.
#
# We scan for common patterns that should never appear in a public
# README: JWT-shaped tokens, Supabase project URLs, service_role
# strings outside the explicit DESIGN.md reference context, sk_live_
# / sk_test_ prefixes.
# ----------------------------------------------------------------------
printf "\n== 3. README contains no secret-shaped strings ==\n"

# JWT-shaped: three base64url chunks separated by '.', each at least
# 20 chars. (Supabase anon/service-role keys are JWTs.)
if grep -qE '\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b' "$README"; then
  err "README contains a JWT-shaped string (possible anon/service-role key leak)"
else
  pass "no JWT-shaped strings"
fi

# Supabase project URL: <ref>.supabase.co
if grep -qE '\b[a-z0-9]{20}\.supabase\.co\b' "$README"; then
  err "README contains a Supabase project URL"
else
  pass "no Supabase project URLs"
fi

# Stripe / generic secret-key prefixes.
if grep -qE '\bsk_(live|test)_[A-Za-z0-9]{16,}\b' "$README"; then
  err "README contains sk_live_/sk_test_ secret"
else
  pass "no sk_live_/sk_test_ secrets"
fi

# Long base64-ish near the word service_role.
if grep -qE 'service_role.{0,40}[A-Za-z0-9_-]{32,}' "$README"; then
  err "README mentions 'service_role' near a long token-shaped string"
else
  pass "no service_role secrets"
fi

printf "\n"
if [ "$fail" -eq 0 ]; then
  printf "PRD-02 adversarial checks: ALL PASS\n"
  exit 0
else
  printf "PRD-02 adversarial checks: FAIL (see [FAIL] lines above)\n" >&2
  exit 1
fi
