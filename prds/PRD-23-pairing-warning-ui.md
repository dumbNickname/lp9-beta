# PRD-23 — Pairing / recovery warning UI (honest copy)

> Status: see `PROGRESS.md`. Later changes below.

## Goal

Show clear, honest warnings at pair time and in settings about what the
recovery password does and does NOT recover, using the honest phrasing
from `DESIGN.md` §3 and §12b.

## What shipped

- A reusable non-blocking callout (`role="note"`, never `alert`, does not
  steal focus; `warning` / `info` variants; semantic theme tokens and
  logical CSS only, so it works in light and dark).
- A recovery warning shown in the recovery-password view in **set** and
  **change** modes (pair-success prompt and settings change-password).
  Not shown in **restore** mode (irrelevant there). It never blocks
  submit or skip.
- Warning content (§12b): the per-relationship key lives only on your
  paired devices; notes are end-to-end encrypted; the recovery password
  is the only way to restore them on a new device; there is no backdoor;
  a forgotten password means old notes are unreadable forever. It
  separates account data stored on our servers from key-gated note text.
- Anonymous data-loss nudge kept at §3 wording verbatim ("Without linking
  an account, you cannot recover your data if you clear your browser or
  switch devices"), shown as an info callout.
- Copy is plain English string literals so i18n extraction is trivial.
- Out: the recovery mechanism (PRD-22); translation (Phase 7).

## Decisions

- Warning travels with the recovery-password component instead of a
  route, so it appears wherever set/change is mounted.
- Exact wording was Dev's to draft within §3/§12b intent; no open
  questions.

## Verification

- Unit + QA render tests assert the required phrases ("unreadable
  forever", "only way to restore", "end-to-end encrypted", "paired
  devices", "stored on our", "no backdoor") on set/change, absent on
  restore, and that submit/skip stay enabled.
- QA source scan: forbidden phrasing ("only on your device" and variants)
  absent from shipped copy; callout CSS uses tokens and logical props only.
- Contrast checked structurally (token-only), not visually.

## Gotchas

- Never claim data is "only on your device". Honest form is key-scoped:
  the key lives only on your paired devices.

## Later changes

- Recovery prompt redesigned ("Keep your notes safe", design session
  2026-10-01): two icon facts up front; the full honest §12b warning text
  sits in a "How recovery works" disclosure. Warning still shown in
  set/change, not restore.
- Onboarding §3 no-account note now lives in a small onboarding footer
  next to the language select (see PRD-26 Later changes).
