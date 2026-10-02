# PRD-45 — "Settings & this device" panel (anonymous mode)

> Status: see `PROGRESS.md`.

## Goal
Anonymous users can see and manage what matters for them on this
device: an honest data note (§3 phrasing), recovery password status
with Set/Change or Unlock notes, and "Reset device". Replaces the bare
footer reset button.

## What shipped
- A "This device" panel: honest data note, recovery password status
  (checked on open: local key + server wrap blob), Set/Change or Unlock
  notes, and Reset device.
- Reuses the recovery password change/restore modes; restore was only
  reachable from locked notes before.
- Reset goes through the confirm sheet (PRD-44) with danger tone.

## Decisions
- Honest copy: "stored on our server, but only this browser can get to
  them" — never "only on your device" (§3).

## Verification
- Unit tests: recovery status shown, reset after confirm, unlock
  offered when a password is set but the local key is missing.

## Later changes
- The panel moved from the `/app` footer into the Settings page
  (PRD-51, `#settings`), always expanded there. When unpaired, a
  collapsed "This device" in the footer keeps reset reachable.
- Recovery prompt redesigned ("Keep your notes safe", design session
  2026-10-01): full §12b warning folded into a "How recovery works"
  disclosure; warning still shown in set/change, not restore.
