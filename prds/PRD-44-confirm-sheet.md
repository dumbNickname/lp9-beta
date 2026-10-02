# PRD-44 — In-app confirm sheet (replace window.confirm)

> Status: see `PROGRESS.md`.

## Goal
Replace the browser pop-ups for claim / retire / delete / reset with a
warm in-app bottom sheet (centered dialog on wide screens).

## What shipped
- One global confirm sheet: callers await a yes/no answer; one host is
  mounted once in `/app`.
- Accessible: alert dialog, modal, focus on the confirm button, Escape
  or backdrop = cancel, focus restored afterwards. A `danger` tone for
  destructive actions.
- Falls back to `window.confirm` when no host is mounted (tests, early
  boot).
- Copy is warm and explains consequences, e.g. the claim sheet: "8
  hearts are set aside until Ben delivers — and returned if it doesn't
  happen."

## Verification
- Unit tests: resolves true on confirm, false on cancel/Escape; falls
  back to `window.confirm` without a host.

## Gotchas
- The sheet renders in a portal, outside the render container: tests
  must query the screen, not the render result.
