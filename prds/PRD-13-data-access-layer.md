# PRD-13 — Data-access layer + reactive profile store

## Goal

Provide the thin swappable data-access module and a Solid store exposing
`refresh()`, so all Supabase reads/writes funnel through one place.

## Scope

**In:**
- `src/lib/data/profile.ts` — typed `getMyProfile()`,
  `updateMyProfile(patch)`; all Supabase calls for profiles go here.
- Generated/typed row types for `profiles` (hand-typed is fine for MVP).
- A Solid store/resource for the current profile exposing `refresh()`
  (`DESIGN.md` §9c); wire **tab-focus refresh** (refetch on
  `visibilitychange`/`focus`).
- All access goes through the layer — no raw `supabase.from()` in
  components.

**Out:**
- Onboarding form UI (PRD-14).
- Other entities (points, coupons, etc.) — later phases; same pattern.
- Supabase Realtime (deferred, `DESIGN.md` §9b).

## Touched files / new files

- `src/lib/data/profile.ts` — new.
- `src/lib/stores/profile.ts` (or context) — new: reactive profile +
  `refresh()` + focus refetch.

## Data model impact

None (consumes PRD-12 schema).

## UI behavior

None directly; provides data to PRD-14.

## Verification

1. `getMyProfile()` returns the signed-in user's row; `updateMyProfile`
   persists and the store reflects it after `refresh()`.
2. Switching away and back to the tab triggers a refetch.
3. No component imports `supabase` directly (grep: only `src/lib/**`).

**Unit tests (Dev):**
- Mock the client; assert the layer calls the right table/columns and
  maps rows to typed objects; `refresh()` updates the store signal.

**QA suite:**
- Adversarial: `updateMyProfile` with fields the user shouldn't set
  (e.g. `id`) is ignored/rejected.
- Focus-refresh does not thrash (single refetch per focus).

## Open questions

(none)
