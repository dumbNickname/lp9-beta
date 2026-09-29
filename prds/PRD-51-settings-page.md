# PRD-51 — Settings as its own page

Owner 2026-09-29: "settings and this device located under the content
is weird … make it a separate page".

## Dev notes
- `SettingsPage.tsx`: a `#settings` view inside the Dashboard (same
  hash mechanism as the worlds; no new prerender route, D-39.1).
  Sections: **You** (name via PairBadge, private mode, theme), **Pairs**
  (+ New pair), **This device** (`DeviceSettings`, now always expanded),
  **About** (home, privacy, terms). "← Back" returns to the previous
  world and restores its hash; tapping any tab also leaves settings.
- The ⋯ menu now reads Private mode, Edit my name, Settings, Home;
  theme lives only on the settings page.
- The `/app` footer no longer renders device settings when paired. When
  unpaired (onboarding/pairing), a collapsed `<details>` "This device"
  keeps the reset escape hatch reachable.
- `ThemeToggle` guards `matchMedia` (crashed in jsdom).
- Local prod build check at 360px: 12/12 pass.
