#!/usr/bin/env bash
# On-demand beta deploy to the Cloudflare Worker (PRD-57): build at "/",
# add the SPA fallback, deploy, and sync the keep-alive targets.
#
# Values come from exported env vars first, then `.env.beta`, then `.env`
# (both gitignored). Needed:
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   beta project (public)
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID  or a prior `wrangler login`
# Optional:
#   VITE_VAPID_PUBLIC_KEY                        beta push public key
#   PROD_SUPABASE_URL, PROD_SUPABASE_KEY         prod keep-alive target
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=lib.sh
. scripts/lib.sh

load_env_file() {
  local file="$1" line key value
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    key="${line%%=*}"; value="${line#*=}"
    value="${value%\"}"; value="${value#\"}"
    if [ -z "${!key:-}" ]; then export "$key=$value"; fi
  done < "$file"
}
load_env_file .env.beta
load_env_file .env

: "${VITE_SUPABASE_URL:?set VITE_SUPABASE_URL (beta project)}"
: "${VITE_SUPABASE_ANON_KEY:?set VITE_SUPABASE_ANON_KEY (beta project)}"
export BASE_PATH=/
export VITE_APP_NAME="${VITE_APP_NAME:-Endeary beta}"

WRANGLER=(pnpm exec wrangler --config cloudflare/wrangler.toml)

log_info "Building beta (${VITE_APP_NAME}) against ${VITE_SUPABASE_URL}"
rm -rf .output
pnpm build
bash scripts/post-build.sh .output/public

log_info "Deploying Worker"
"${WRANGLER[@]}" deploy

log_info "Syncing keep-alive targets"
secrets="$(node -e '
  const e = process.env, o = { BETA_SUPABASE_URL: e.VITE_SUPABASE_URL, BETA_SUPABASE_KEY: e.VITE_SUPABASE_ANON_KEY };
  if (e.PROD_SUPABASE_URL && e.PROD_SUPABASE_KEY) { o.PROD_SUPABASE_URL = e.PROD_SUPABASE_URL; o.PROD_SUPABASE_KEY = e.PROD_SUPABASE_KEY; }
  process.stdout.write(JSON.stringify(o));')"
printf '%s' "$secrets" | "${WRANGLER[@]}" secret bulk >/dev/null
[ -n "${PROD_SUPABASE_URL:-}" ] || log_warn "PROD_SUPABASE_URL/KEY not set: prod is not kept alive yet"
log_ok "Beta deployed"
