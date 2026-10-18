#!/usr/bin/env bash
# Post-build step for the static output (GitHub Pages and the beta Worker).
#
# GitHub Pages serves 404.html for any path it can't match to a file.
# Copying the app shell there makes client-side deep-links into /app/*
# work: the shell loads, reads the URL, and renders the right view
# (DESIGN.md §11b, option a).
set -euo pipefail

OUT_DIR="${1:-.output/public}"

if [ ! -f "$OUT_DIR/index.html" ]; then
  echo "[post-build] $OUT_DIR/index.html not found; did the build run?" >&2
  exit 1
fi

cp "$OUT_DIR/index.html" "$OUT_DIR/404.html"
echo "[post-build] wrote $OUT_DIR/404.html (SPA deep-link fallback)"

# Not indexed until launch (PRD-57, D-57.8).
printf 'User-agent: *\nDisallow: /\n' > "$OUT_DIR/robots.txt"

# Per-build product name in the PWA manifest (D-57.7).
if [ -n "${VITE_APP_NAME:-}" ] && [ -f "$OUT_DIR/manifest.webmanifest" ]; then
  APP_NAME="$VITE_APP_NAME" node -e '
    const fs = require("fs"), f = process.argv[1], m = JSON.parse(fs.readFileSync(f, "utf8"));
    m.name = process.env.APP_NAME; m.short_name = process.env.APP_NAME;
    fs.writeFileSync(f, JSON.stringify(m, null, 2) + "\n");' "$OUT_DIR/manifest.webmanifest"
  rm -f "$OUT_DIR/manifest.webmanifest.gz" "$OUT_DIR/manifest.webmanifest.br"
  echo "[post-build] manifest name = $VITE_APP_NAME"
fi
