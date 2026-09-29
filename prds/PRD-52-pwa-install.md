# PRD-52 — Installable PWA + browser colour

Owner 2026-09-29: "add the desktop icon on mobile PWA style … hide the
browser / color the browser the same". Supersedes DESIGN §8a "no PWA
install flow in MVP" (recorded there).

## Scope
- `public/manifest.webmanifest`: relative `start_url ./app`, `scope ./`
  (works under the GH Pages sub-path), `display: standalone`, paper
  colours, icons 192/512 + maskable 512.
- `public/icons/`: heart-on-ember placeholder mark (SVG source + PNGs
  rendered with headless Chromium, see Dev notes); favicon-32,
  apple-touch-icon 180.
- `src/entry-server.tsx`: manifest + icon links, `mobile-web-app-capable`,
  apple meta (capable, status-bar default, title = APP_NAME),
  `viewport-fit=cover`.
- theme-color: set pre-paint by `THEME_INIT_SCRIPT` and updated by
  `applyEffectiveTheme` (light `#f4ebe0`, dark `#3a1f19`) -> the browser
  bar / status bar matches the theme.
- `public/sw.js`: installs the app shell; network-first navigations with
  a cached fallback (offline launch), cache-first `/_build/assets/` +
  icons; ignores cross-origin (Supabase never cached). Push handlers for
  PRD-53.
- `src/lib/pwa.ts` registers the SW (prod only). `InstallApp.tsx` in
  Settings: Install button (`beforeinstallprompt`) or iOS "Share -> Add
  to Home Screen" hint; shows "Installed" in standalone.

## Dev notes
- Icons were rendered by a throwaway Playwright script (SVG ->
  screenshot); re-run when the brand mark exists.
- Verified on a local prod build: theme-color light/dark, SW active with
  scope `/lp9-beta/`, manifest parses with 0 errors, the only
  installability error is `in-incognito` (a Playwright artifact), icons
  served, offline reload shows the shell.
- ESLint: `public/sw.js` gets SW globals in `eslint.config.js`.
