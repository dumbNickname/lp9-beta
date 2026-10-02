# PRD-31 — Privacy mode (shoulder-surf veil)

> Status: see `PROGRESS.md`.
> Later changes: default and persistence replaced by the `DESIGN.md`
> §15c amendment of 2026-10-01 (see below).

## Goal

A private-mode toggle (eye icon) that hides heart comments behind a
placeholder so notes are safe from shoulder-surfing (`DESIGN.md` §15).

## What shipped

- Eye / eye-off toggle (strike line when on), `aria-pressed` = private
  on, label "Private mode on/off". Placed in the dashboard head, the only
  place with private content at the time.
- When on, each comment shows "Comment hidden — private mode" (§15d);
  amount and date stay visible.
- The composer's own text is never hidden (the user is typing it).
- Originally ON at every launch and in-memory only (reload -> ON again).

Out: per-coupon private flags (PRD-38).

## Decisions

- **D-31.1** Privacy mode signal is in-memory only, default ON per load;
  no storage dependency until per-coupon flags need it. Superseded by
  §15c 2026-10-01 (now remembered per device).

## Verification

- Unit tests: fresh load hides comments and keeps amounts; toggle off
  shows them and stays off within the app; reload hides again (original
  contract, since replaced).

## Later changes

- §15c amended 2026-10-01 (PRD-38 and design session): OFF by default,
  remembered per device (localStorage `privacy_mode`).
- One eye toggle in the app bar; Settings mirrors it.
- Veiled notes and private wishes are tappable: "Show this one" / "Turn
  private mode off" / "Keep hidden". One-time hint under the eye.
- The old hidden-coupon "Unmark" link was replaced by the veil.
