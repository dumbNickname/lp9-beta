# PRD-14 — First-launch onboarding (display name + locale + archetype hint)

> Status: see `PROGRESS.md`.

## Goal

On first launch, after anonymous sign-in, collect display name, locale
and an archetype hint, and persist them, so the user lands on the
dashboard from then on.

## What shipped

- `/app` shows onboarding while the profile has no `display_name`;
  once set, the dashboard shows instead. Reload keeps the user past
  onboarding and keeps the same anonymous user.
- Fields: display name, locale (`en`/`pl`/`de`), archetype hint
  (`getting_to_know` / `established_couple` / `close_friends`). Name and
  locale go to the profile.
- Honest, non-blocking data-loss nudge per `DESIGN.md` §3 (no account
  means it cannot be recovered).
- Out: pairing and archetype template application (Phase 2 / Phase 4),
  Google account linking (Phase 8).

## Decisions

- Archetype hint stored device-locally under storage key
  `archetype_hint`, not a profile column: no migration for a temporary
  pre-pair value. It moves to `relationships.archetype` at pair time.
- Display name: required, trimmed, max 50 chars.

## Verification

- Unit: form submits the entered values; gate keys off `display_name`.
- QA: empty name rejected, long input handled, reload mid-onboarding
  keeps the anon user.

## Later changes

- Archetype select became chips ("New together" / "Long-term" / "Close
  friends"), hidden when joining via an invite link.
- Language select and the honest no-account note (§3 wording) moved to
  a small footer.
- Joiner via link: onboarding shows "<inviter> is waiting for you" and a
  "Join <name>" button that pairs in one tap (D-UX.1; the D-25.1 confirm
  still applies to scan/paste). The `#pair=` fragment is captured at app
  start into memory, so it survives onboarding (design session
  2026-10-01).
- Loading gate covers first load only (no remount on refresh).
