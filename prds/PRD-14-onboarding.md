# PRD-14 — First-launch onboarding (display name + locale + archetype hint)

## Goal

On first launch, after anonymous sign-in, collect display name, locale,
and an archetype hint, and persist them to the profile.

## Scope

**In:**
- Onboarding screen at `/app` shown when the profile has no
  `display_name` yet.
- Fields: display name (text), locale (`en`/`pl`/`de`), archetype hint
  (getting_to_know / established_couple / close_friends) — the hint is
  stored for use at pair time (Phase 2); persist via `updateMyProfile`.
- Honest data-loss nudge per `DESIGN.md` §3 ("you can't recover it
  without an account"), non-blocking.
- Once `display_name` is set, `/app` shows the placeholder dashboard.

**Out:**
- Actual pairing / archetype template application (Phase 2 / Phase 4).
- Google account linking (Phase 8).
- Persisting the archetype hint to a relationship (no relationship yet;
  store on profile or local until Phase 2 — decide in Dev notes).

## Touched files / new files

- `src/routes/app.tsx` — gate: onboarding vs dashboard on
  `display_name`.
- `src/components/Onboarding.tsx` — new form.
- Possibly `src/lib/data/profile.ts` — extend if archetype hint needs a
  column (flag in Open questions if so).

## Data model impact

- Ideally none beyond PRD-12. If archetype hint needs storage before
  relationships exist, note it — a `profiles` column addition would be a
  new migration (flag, don't assume).

## UI behavior

First launch → form (name, locale, archetype). Submit → profile saved →
dashboard placeholder. Reload → no form (name persists). Uses theme
tokens; logical CSS only.

## Verification

1. Fresh browser → onboarding form appears at `/app`.
2. Submit → values persist; reload shows dashboard, not the form.
3. Locale choice reflected in profile.
4. Data-loss nudge visible and honestly worded.

**Unit tests (Dev):**
- Onboarding renders; submit calls `updateMyProfile` with entered
  values; gate logic (form vs dashboard) keys off `display_name`.

**QA suite:**
- Adversarial: empty display name rejected; overly long input handled.
- Reload mid-onboarding does not lose the anon user.

## Open questions

- Where to store the archetype hint pre-pairing (profile column vs
  local)? Dev decides and records; a new column needs its own migration.
