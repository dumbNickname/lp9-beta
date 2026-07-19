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

## Dev notes

### What / where mounted

- New `src/components/Callout.tsx` — presentational, `role="note"`
  (non-blocking; not an `alert`, does not steal focus). Props
  `variant?: 'warning' | 'info'` (default `warning`), optional `title`,
  `children`. Colors from semantic tokens only (`--color-muted-bg`,
  `--color-accent`, `--color-fg`, `--color-border`) so it renders in
  light + dark. Logical CSS only.
- New `src/components/RecoveryWarning.tsx` — composes `Callout` with the
  honest recovery copy as plain string literals (i18n-extractable, no
  dynamic sentence building).
- Wired `<RecoveryWarning/>` into `src/components/RecoveryPassword.tsx`,
  gated behind the existing `needsConfirm()` (`mode === "set" ||
  "change"`). It renders above the form fields and does **not** block
  skip/submit. **Not** shown for `restore` mode (restoring is focused;
  the forgotten-password-loss warning is irrelevant there).
- **Why component-level (not a route):** no Settings route exists yet
  (Phase 8) and `change` mode isn't routed anywhere. Mounting the
  warning inside `RecoveryPassword` covers PRD-23 surfaces (1)
  pair-success/set-password (already mounted as the `set` overlay in
  `src/routes/app.tsx`) and (2) settings/change-password — the warning
  travels with the component to wherever `change` is later mounted.

### Exact phrases (for QA grep)

Required phrases present in `RecoveryWarning`:
- `unreadable forever`
- `only way to restore`
- `end-to-end encrypted`
- `paired devices`
- `stored on our` (servers — distinguishes account-recoverable data
  from key-gated comment text)

Forbidden phrase (asserted absent, case-insensitive): `only on your
device`.

### Onboarding alignment (§3)

The existing anon nudge already matched §3 verbatim ("Without linking an
account, you cannot recover your data if you clear your browser or
switch devices" — DESIGN.md line 42). Wording **unchanged**; only wrapped
it in `<Callout variant="info">` for visual consistency. It does not
contain the forbidden phrase.

### Self-test results

- `pnpm typecheck` — pass (clean).
- `pnpm lint` — pass (0 warnings).
- `pnpm test` — pass: `Test Files 31 passed (31) | Tests 203 passed
  (203)`. New: `callout.test.tsx`, `recovery-warning.test.tsx`,
  `recovery-password.test.tsx` (set/change show warning, restore does
  not).
- `pnpm build` — pass; static output in `.output/public`, `.output/server`
  empty (no server runtime).

### Gotchas for QA

- `recovery-password.test.tsx` mocks `~/lib/crypto/recovery`,
  `~/lib/crypto/keystore`, `~/lib/data/relationship` at import time
  (RecoveryPassword pulls them in eagerly).
- QA grep targets: assert the 5 required phrases above appear on the
  set/change surfaces; assert `only on your device` appears **nowhere**
  in `src/`. The `restore` mode must NOT show the warning.
- `Callout` renders `role="note"` (not `alert`) by design — QA should
  confirm it doesn't grab focus.

## QA findings

Verified on branch `feat/PRD-23-pairing-warning-ui` (working tree atop
commit `9037d01`). Read-only on production code.

### Verification steps

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | Pair-success / `set` screen shows recovery warning with "forgotten password = comments unreadable forever" | PASS | `RecoveryPassword` gates `<RecoveryWarning/>` behind `needsConfirm()` (`set`/`change`); warning contains `unreadable forever`, `only way to restore`, `no backdoor`. |
| 2 | Settings / `change` mode shows the same warning | PASS | Same `needsConfirm()` gate covers `change`. No Settings route yet (Phase 8); warning travels with the component to wherever `change` mounts — acceptable per Dev notes. |
| 3 | No copy claims data "only on your device"; anon nudge matches §3 | PASS | Repo-wide src/ scan (comments stripped): forbidden phrase absent from shipped copy. Anon nudge is §3 verbatim ("Without linking an account, you cannot recover your data..."). |
| 4 | Warnings use theme tokens, render light/dark w/o contrast issues | PASS (static) | `.callout*` CSS uses only `var(--color-*)`/`var(--space-*)`/`var(--border-thin)`/`var(--radius)`; no raw hex/rgb/hsl. Rendered contrast not visually tested (no browser); token-only usage guarantees both themes resolve. |

All four commands passed with QA tests included: `pnpm typecheck` (clean),
`pnpm lint` (0 warnings), `pnpm test` (33 files / 233 tests), `pnpm build`
(static; `.output/server` empty — 0 files).

### Adversarial / consistency tests added (`tests/qa/`)

- **`pairing-warning-copy.adversarial.test.ts`** (source-scan, 16 tests):
  - **Forbidden-phrasing scan:** walks all `src/**/*.{ts,tsx,css}`, strips
    comments, asserts none of `only on your device` / `only on this
    device` / `just on your device` / `data is only on` / `stored only on
    your` / `lives only on your device` appear in shipped copy.
    Result: clean. The one raw occurrence of "only on your device" is a
    RecoveryWarning docstring quoting the §3 ban; confirmed it does NOT
    survive comment-stripping (not shipped copy).
  - **Honest device claim distinction:** confirms RecoveryWarning says the
    key lives "only on your paired devices" (plural, key-scoped, honest per
    §12b) — distinct from the forbidden data-scoped "only on your device".
  - **`.callout` CSS hygiene:** color decls all reference `var(--color-*)`;
    no hex/rgb/hsl; no physical `margin/padding/border-left|right|top|
    bottom`, no physical `left/right/top/bottom` inset, no `text-align:
    left|right`; logical `padding-inline`/`margin-block`/`border-inline-
    start` present.
  - **Focus hygiene (source):** `Callout` emits `role="note"`, never
    `role="alert"`, no `autofocus`/`.focus(`/`tabindex`.
- **`pairing-warning-surface.adversarial.test.tsx`** (render, 14 tests):
  - **Honesty:** warning renders `unreadable forever`, `only way to
    restore`, `end-to-end encrypted`, `no backdoor`, distinguishes
    server-recoverable data (`stored on our` servers) from key-gated
    `comment text`; asserts it does NOT overclaim ("everything is
    recoverable" / "all your data can be recovered" absent).
  - **Surface coverage:** (1) `set` renders warning; (2) `change` renders
    warning; (3) `restore` does NOT render warning but still renders its
    unlock form (not blank); non-blocking.
  - **Non-blocking (set):** submit ("Set password") and skip ("Skip for
    now") buttons render and are enabled while the warning is present; the
    note is `role="note"`, no `role="alert"` on initial render.
  - **Anon nudge:** renders §3 wording ("cannot recover" / "without linking
    an account"); does NOT overclaim comment-specific "only on your/this
    device" or leak E2E-key semantics; wrapped in a non-blocking
    `callout--info` note.

### Defects

None. All Verification steps and all 30 adversarial cases pass. gitleaks
reports no leaks; the new test files contain no secret-like strings.

### Caveats (non-blocking, for the record)

- Step 4 contrast is verified structurally (token-only CSS), not via a
  rendered browser check — no visual regression harness exists yet.
- Surfaces (1) and (2) are both covered by the single `RecoveryPassword`
  component; there is no separate Settings route yet (Phase 8). The
  `change`-mode surface is not routed anywhere in the app today, but the
  warning correctly travels with the component. Reasonable per PRD scope.
