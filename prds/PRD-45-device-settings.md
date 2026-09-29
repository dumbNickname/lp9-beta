# PRD-45 — "Settings & this device" panel (anonymous mode)

## Goal
Anonymous users can see and manage what matters for them on this
device: an honest data note (§3 phrasing), recovery password status
with Set/Change or Unlock notes, and "Reset device". Replaces the bare
footer reset button.

## Scope
`src/components/DeviceSettings.tsx` in the `/app` footer, collapsed by
default. The status is checked on open (IndexedDB key + server wrap
blob). Reuses `RecoveryPassword` change/restore modes (restore was only
reachable from locked notes before).

## Dev notes
- Honest copy: "stored on our server, but only this browser can get to
  them" (never "only on your device", §3).
- Reset goes through the confirm sheet with danger tone.
