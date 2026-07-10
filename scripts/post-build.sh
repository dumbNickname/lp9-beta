#!/usr/bin/env bash
# Post-build step for GitHub Pages.
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
