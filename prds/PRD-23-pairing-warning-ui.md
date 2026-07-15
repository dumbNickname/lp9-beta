# PRD-23 — Pairing / recovery warning UI (honest copy)

## Goal

Show clear, honest warnings at pair time and in settings about what
recovery-password does and does NOT recover, using the honest phrasing
from `DESIGN.md` §3 and §12b.

## Scope

**In:**
- Warning surfaces:
  - At pair success / recovery-password prompt (PRD-22): explain that
    the per-relationship key lives only on paired devices; a recovery
    password is the only way to restore comments on a new device;
    **forgotten password = old comments unreadable forever** (§12b).
  - In settings, near "change recovery password": same honest summary.
  - Anonymous data-loss nudge consistency with §3 ("you can't recover it
    without an account") — align wording; do not claim "only on your
    device."
- Copy is honest and specific: distinguishes account-recoverable data
  (on Supabase) from comment text (E2E, key-gated).
- Uses theme tokens; logical CSS; a reusable `Warning`/`Callout`
  component if warranted.

**Out:**
- The recovery mechanism itself (PRD-22).
- i18n translation of the copy (Phase 7) — write in English via the
  string pattern used elsewhere so extraction is trivial later.

## Touched files / new files

- `src/components/RecoveryWarning.tsx` (or a shared `Callout`) — new.
- Wire into PRD-21 pair success and PRD-22 set/change views.
- Possibly `src/components/Onboarding.tsx` — align the existing anon
  data-loss nudge wording.

## Data model impact

None.

## UI behavior

Prominent but non-blocking callouts at the three surfaces above, with
honest, specific language.

## Verification

1. Pair-success / set-password screen shows the recovery warning with
   the honest "forgotten password = comments unreadable forever"
   statement.
2. Settings shows the same warning near change-password.
3. No copy anywhere claims data is "only on your device"; anon nudge
   matches §3.
4. Warnings use theme tokens and render in light/dark without contrast
   issues.

**Unit tests (Dev):**
- Component renders the required key phrases (assert on text).
- Warnings appear in the expected parent contexts (smoke).

**QA suite:**
- Adversarial/consistency: grep for forbidden phrasing ("only on your
  device"); verify all three surfaces present; check the wording matches
  §3/§12b intent (no dishonest reassurance).

## Open questions

(none — copy intent is fixed by §3 and §12b; exact wording is Dev's to
draft within that intent.)
