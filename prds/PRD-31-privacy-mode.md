# PRD-31 — Privacy mode (shoulder-surf veil)

> Tiny PRD per `DESIGN.md` §16b. Ambiguity -> STOP, load `grill-me`.

## Goal

A global private-mode toggle (eye icon in app header) that hides heart
comments behind a placeholder; ON at every app launch, sticky within the
session (`DESIGN.md` §15).

## Scope

**In:**
- `src/lib/privacy.ts` (new) — `privateMode()` signal, default `true` on
  module load, `setPrivateMode`, `togglePrivateMode`. In-memory only:
  reload => ON again (§15c). Session-sticky within the SPA.
- Header toggle `PrivacyToggle.tsx` — visible on `/app` only; eye /
  eye-off inline SVG, `aria-pressed`, label "Private mode on/off".
- `HeartNote` respects it: comment replaced by "Comment hidden — private
  mode" placeholder (§15d); amount + date still visible.
- Composer: textarea content itself is not hidden (user is typing it).

**Out:** per-coupon private flags + `@solid-primitives/storage` (Phase 4,
when coupons exist — no dependency added now; D-31.1).

## Touched files / new files

- `src/lib/privacy.ts`, `src/components/PrivacyToggle.tsx` (new)
- `src/app.tsx` (header slot) or `src/routes/app.tsx`
- `src/components/HeartNote.tsx`, `global.css`
- `tests/unit/privacy.test.tsx`

## Verification

1. Fresh load: comments hidden, placeholder visible, amounts visible.
2. Toggle off: comments visible; navigate within app -> still visible.
3. Reload: hidden again.

## Open questions

None.

---

## Dev notes

- `src/lib/privacy.ts` module-level signal, default true (reload means
  ON again).
- `PrivacyToggle` is in the dashboard head, not the global header (the
  dashboard is the only place with private content right now).
- `aria-pressed` = private on. The eye icon gets a strike line when on.
