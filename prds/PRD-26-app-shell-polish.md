# PRD-26 — App shell polish + navigation + mobile selectors

> Status: see `PROGRESS.md`. Later changes below.

## Goal

Make the app navigable and presentable on mobile. Owner feedback: no way
to move between pages, pages looked very raw, and the archetype/locale
pickers broke layout on mobile.

## What shipped

- Shared site nav in the root header on every page: Home, App, Privacy,
  Terms; links prefixed by the router base so they work under
  `/lp9-beta/`; keyboard-accessible; current page marked; theme toggle
  kept.
- Archetype and locale pickers became native labelled `<select>`s with
  unchanged values (archetype: `getting_to_know` / `established_couple` /
  `close_friends`; locale: `en` / `pl` / `de`).
- Light styling pass with existing theme tokens and logical CSS only:
  spacing, readable container, buttons, form fields, focus ring, callouts.
  No new hues, no brand overhaul (name pending §14i). `APP_NAME` constant
  kept; English nav literals (i18n in Phase 7).
- **Reset account (start fresh):** confirm-guarded action that clears
  device keys (IndexedDB), only the pairing/recovery localStorage markers
  (`pair_invite_pending`, `archetype_hint`, `recovery_prompted:*`; leaves
  `theme` etc.), signs out and reloads into a fresh anonymous user.
- Out: server-side unpair / relationship dissolve (future PRD); pairing
  logic (PRD-25); full brand redesign.

## Decisions

- **D-26.1** Nav + dropdowns + light token-only polish, not a redesign:
  "clean and tidy" until the brand exists.
- **D-26.2** Reset account is LOCAL only: it unblocks pairing re-tests on
  a real phone (no incognito) when the anon user is already paired, but
  does not dissolve the server relationship (that is the future unpair).
- Nav lives in the shared root header, one wiring point for all pages.

## Verification

- Unit tests: nav links base-prefixed under `/lp9-beta`; selects carry
  exactly the allowed options and submit saves the chosen value; reset
  clears keys + the three marker kinds, signs out, keeps unrelated keys.
- Owner/live checks: nav hrefs resolve on the deployed sub-path; reset
  cancel is safe and confirm lands on fresh onboarding.

## Later changes

- PRD-49: site header is hidden inside `/app`; the app has its own app
  bar. Since 2026-10-01 the mobile app bar is two rows (pair name + eye
  + more; full-width heart wallet strip), home icon only in the menu on
  mobile; desktop is one row.
- Onboarding (design session 2026-10-01): archetype select replaced by
  chips ("New together" / "Long-term" / "Close friends"), hidden when
  joining via link; language select + honest §3 no-account note sit in
  a small footer.
- PRD-45 "Settings & this device" panel now lives in the Settings page
  (PRD-51, `#settings`); a visual "How it works" page (`#guide`) was
  added.
- 2026-10-01 visual redesign went beyond the light pass: tasteful motion
  now allowed (owner); still no streaks/scores/comparisons; line icons
  instead of emoji glyphs in UI.
- Loading gates cover first load only; the dashboard remounts only when
  the pair id changes.
