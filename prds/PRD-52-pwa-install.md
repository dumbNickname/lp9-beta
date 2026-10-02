# PRD-52 — Installable PWA + browser colour

> Status: see `PROGRESS.md`.

## Goal
Owner 2026-09-29: "add the desktop icon on mobile PWA style … hide the
browser / color the browser the same". Supersedes DESIGN §8a "no PWA
install flow in MVP" (amendment recorded there).

## What shipped
- **Manifest:** relative `start_url ./app`, `scope ./` (works under the
  GitHub Pages sub-path), `display: standalone`, paper colours, icons
  192/512 + maskable 512; favicon-32 and apple-touch-icon 180.
- **Icons:** heart-on-ember placeholder mark (SVG source + rendered
  PNGs) until the brand exists.
- **Head meta:** manifest + icon links, mobile/apple web-app capable,
  status bar default, title = `APP_NAME`, `viewport-fit=cover`.
- **Browser colour:** `theme-color` set before first paint and updated
  on theme change (light `#f4ebe0`, dark `#3a1f19`), so the browser
  bar / status bar matches the theme.
- **Service worker** (registered in production only), scoped to the
  sub-path: caches the app shell; navigations network-first with a
  cached fallback (offline launch); build assets + icons cache-first.
  Hosts the push handlers for PRD-53.
- **Install row in Settings:** Install button where the browser offers
  an install prompt, an iOS "Share -> Add to Home Screen" hint
  otherwise, "Installed" when running standalone.

## Decisions
- The service worker never caches cross-origin requests: Supabase
  traffic stays network-only (no stale or private data in the cache).

## Verification
- Local prod build: theme-color light/dark, SW active with scope
  `/lp9-beta/`, manifest parses with 0 errors, only installability
  error is `in-incognito` (automation artifact), icons served, offline
  reload shows the shell.
- Owner/device: real install on Android and iOS home screen.

## Gotchas
- Icons were rendered by a throwaway headless-browser script (SVG ->
  screenshot); re-run when the brand mark exists.
- The service worker file needs SW globals in the ESLint config.
