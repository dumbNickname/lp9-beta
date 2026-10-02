# PRD-51 — Settings as its own page

> Status: see `PROGRESS.md`.

## Goal
Owner 2026-09-29: "settings and this device located under the content
is weird … make it a separate page".

## What shipped
- `#settings` view inside the dashboard (same hash mechanism as the
  worlds; no new prerender route, D-39.1). Opens directly from the URL.
- Sections: **You** (name, private mode, theme), **Pairs** (+ New
  pair), **This device** (PRD-45 panel, always expanded), **About**
  (home, privacy, terms).
- "Back" returns to the previous world and restores its hash; tapping
  any tab also leaves settings.
- The "⋯" menu reads Private mode, Edit my name, Settings, Home; theme
  lives only on the settings page.
- The `/app` footer no longer shows device settings when paired. When
  unpaired (onboarding/pairing), a collapsed "This device" keeps the
  reset escape hatch reachable.
- Later rows added here: Install the app (PRD-52), Notifications
  (PRD-53).

## Verification
- Unit tests: opens from the menu, Back returns to the tab, `#settings`
  in the URL opens it directly.
- Local prod build check at 360px.

## Gotchas
- Guard `matchMedia` (missing in jsdom; the theme toggle crashed).

## Later changes
- Private mode is primarily the eye toggle in the app bar; Settings
  mirrors it (DESIGN §15c amended 2026-10-01).
- A visual "How it works" page `#guide` sits alongside settings.
