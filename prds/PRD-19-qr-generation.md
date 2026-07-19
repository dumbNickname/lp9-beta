# PRD-19 — QR generation (invite payload with embedded key)

## Goal

Generate a QR code encoding the pairing `code` plus the base64
per-relationship key, so scanning it pairs and transfers the key in one
step (§12a, §13a note).

## Scope

**In:**
- Pick the smaller of `qrcode` / `qr-code-styling`; verify permissive
  license (MIT or similar) and `minimumReleaseAge`. Record choice.
- `src/lib/pairing/qr.ts`:
  - `buildInvitePayload(code: string, keyBase64: string): string` — a
    compact, versioned payload (e.g. JSON or `v1:<code>:<keyB64>`).
  - `parseInvitePayload(payload: string): { code, keyBase64 } | null`.
- `src/components/InviteQR.tsx` — renders the QR for a given payload
  (canvas/svg), plus shows the manual `code` fallback text.

**Out:**
- Scanning (PRD-20).
- Generating the key (PRD-17) / storing it (PRD-18) — this PRD only
  embeds an already-generated key's base64.
- The full pair-flow orchestration (PRD-21).

## Touched files / new files

- `src/lib/pairing/qr.ts` — new (payload build/parse).
- `src/components/InviteQR.tsx` — new (render).
- `package.json` — add the chosen QR lib.

## Data model impact

None.

## UI behavior

Given a payload, shows a scannable QR and the manual code beneath it.

## Verification

1. `buildInvitePayload` + `parseInvitePayload` round-trip code + key.
2. `parseInvitePayload` returns null for malformed / wrong-version
   input (no throw).
3. `InviteQR` renders a QR element for a payload; the manual code is
   visible as text.
4. QR visually scannable (owner spot-check on device in PRD-21).

**Unit tests (Dev):**
- `tests/unit/pairing-qr.test.ts`: payload round-trip, version mismatch
  → null, malformed → null.
- Component smoke: `InviteQR` renders without error and shows the code.

**QA suite:**
- Adversarial: payload with injected separators / oversized key /
  missing fields → parse returns null, never throws.

## Open questions

- Payload format (JSON vs delimited) and version prefix scheme — Dev
  picks a compact, forward-compatible format and records.
- Chosen QR library + license — Dev records.

## Dev notes

### Library
- **`qrcode@1.5.4`** (generation-only, MIT license). Verified via
  `npm view`: license `MIT`, `1.5.4` published 2024-08-05 — well past
  pnpm `minimumReleaseAge` (~14 days). Installed cleanly, no native
  build scripts, no `strictDepBuilds` conflict.
- **`@types/qrcode@1.5.5`** (dev dep, MIT, published 2023-11-07 —
  mature). Pinned 1.5.5 rather than the newer 1.5.6 to match the API
  surface used; 1.5.6 is also age-eligible if a bump is ever wanted.
- Both pinned **exact** (no caret) to match the repo's exact-pin style
  for `@supabase/supabase-js`, `solid-js`, `vitest`, `fake-indexeddb`.
- Considered library `qr-code-styling` was not chosen: heavier, styling
  features unneeded here.

### Payload format (confirmed)
- Compact, versioned, delimited string: **`v1:<code>:<keyBase64>`**.
- `keyBase64` uses the same standard base64 alphabet as
  `bytesToBase64` in `~/lib/crypto/aes` (may contain `+` `/` `=`, never
  `:`).
- `parseInvitePayload` splits on the **first two colons only**: version,
  code, then the *rest* is the key verbatim (`indexOf` twice, then
  `slice` — no split-limit that could truncate a key). This is robust
  even against stray colons in the tail.
- Returns `null` (never throws) when: input is not a string, version
  != `v1`, fewer than 3 delimited parts, empty code, or empty key.
- Version prefix leaves room for `v2:` etc. without ambiguity.

### Component
- `InviteQR.tsx` props: `payload: string`, `code: string`. Renders the
  payload into a `<canvas>` via `QRCode.toCanvas` in `onMount` (guarded
  by the `ref`; async errors flip an `error` signal to show a text
  fallback). Manual `code` always rendered as visible text beneath.
  Follows existing SolidJS conventions (signals, `onMount`, `Show`,
  `class` hooks; error styling reuses the `.error` class + `role`).

### Self-test results
- `pnpm typecheck` — pass (clean).
- `pnpm lint` — pass (0 warnings).
- `pnpm test` — 8 files / 38 tests pass, incl. new
  `tests/unit/pairing-qr.test.ts` (round-trip with a real base64 key
  containing `+` `/` `=`, version mismatch, missing/empty fields,
  adversarial no-throw) and `tests/unit/invite-qr.test.tsx` (render
  smoke; manual code visible).
- `pnpm build` — pass. Preset `static`; output in `.output/public/`.

### Gotchas for QA
- **`.output/server` exists but is EMPTY** (zero files) — a harmless
  artifact of the nitro-prerender step under the `static` preset, not a
  server runtime. `nitro.json` confirms `"preset": "static"`. This is
  pre-existing build behavior, unaffected by this PRD.
- **jsdom `<canvas>` has no 2d context**, so the component smoke test
  **mocks `qrcode`** (`vi.mock("qrcode", ...)`). The real QR render is
  not exercised in unit tests — visual scannability is the owner
  spot-check in PRD-21 (Verification step 4). QA testing rendering in
  jsdom must mock the lib the same way or use a canvas polyfill.
- `parseInvitePayload` accepts arbitrary strings after the second colon
  as the key; it does **not** validate that the key is well-formed
   base64 or the right length. That validation belongs to the
   key-import step (PRD-17/PRD-20 scanning), not here — scope-correct.

## QA findings

Verified independently on branch `feat/PRD-19-qr-generation`. Result:
**PASS → qa-done**. No defects.

### Verification table

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | `buildInvitePayload` + `parseInvitePayload` round-trip code + key | PASS | Confirmed via Dev unit test and QA 500-key fuzz + padding-length fuzz. Lossless for all valid base64 keys. |
| 2 | `parseInvitePayload` returns null for malformed / wrong-version input (no throw) | PASS | QA suite feeds ~60 adversarial inputs (non-strings, wrong version, injected separators, oversized/garbage keys, unicode/RTL/emoji/SQL-ish, empty fields); parse never throws and returns null on every structurally-invalid case. |
| 3 | `InviteQR` renders a QR element for a payload; manual code visible as text | PASS | Dev smoke test (`tests/unit/invite-qr.test.tsx`) renders a `<canvas>` and asserts the code text is in the DOM. `qrcode` is mocked (jsdom canvas has no 2d context) — acceptable; real render is the PRD-21 owner spot-check. |
| 4 | QR visually scannable | DEFERRED (by PRD) | Explicitly owner spot-check in PRD-21; out of QA's automated scope. |

### Full verification commands

- `pnpm typecheck` — PASS (clean).
- `pnpm lint` — PASS (0 warnings, `--max-warnings 0`).
- `pnpm test` — PASS: 9 files / 47 tests (was 8/38; QA adds 9 tests).
- `pnpm build` — PASS: preset `static`, output in `.output/public/`.

### `.output/server` emptiness (Dev gotcha confirmed)

`find .output/server -type f` returns **0 files**; the directory exists
but is empty. `.output/nitro.json` shows `"preset": "static"`. No server
runtime ships. Dev's observation is accurate.

### Format-safety analysis (round-trip holds for ALL valid AES keys)

`bytesToBase64` in `~/lib/crypto/aes` uses `btoa`, whose output alphabet
is `A-Za-z0-9+/=` — it **never** contains `:`. Therefore the `v1:<code>:<keyBase64>`
delimited format is unambiguous: the first two colons cleanly separate
version and code, and the entire tail after the second colon is the key
verbatim. `parseInvitePayload` uses `indexOf` twice + `slice` (no split
limit), so no key can be truncated. Verified empirically by a 500-iteration
random-key fuzz and a 0/1/2-padding-length test — all lossless.

### Adversarial tests written

Location: `tests/qa/pairing-qr.adversarial.test.ts` (9 tests, all PASS).

- **Bad input / no-throw:** ~60 inputs incl. injected extra colons
  (`v1:v1:code:key`, `::v1:code:key`), oversized keys (100k chars,
  50k-char symbol runs), garbage/non-base64 keys, empty/whitespace-only
  strings, unicode/RTL/emoji/SQL-ish codes, and non-string types
  (`null`, `undefined`, numbers, `NaN`, booleans, `{}`, `[]`, `Symbol`,
  function, `Date`, `BigInt`). Proves `parseInvitePayload` **never
  throws** and returns `null` on every structurally-invalid case.
- **Wrong/absent version prefix:** `v2:`, `V1:` (case), `v10:`, leading
  space, `:code:key`, `code:key` → all null.
- **Split-on-first-two-colons robustness:** `v1:CODE:aa:bb:cc:dd` →
  key `aa:bb:cc:dd` intact; `+ / =` tails preserved verbatim; proves the
  key is not truncated.
- **Round-trip integrity:** a real 32-byte AES key whose base64 contains
  `+`, `/`, `=`; a 500-key random fuzz; all padding lengths (0/1/2 pad
  chars); codes with unicode/emoji/hyphens. All lossless.

### Defects

None. Every Verification step and adversarial case passed. The
key-format-validation gap (parse does not check base64 well-formedness)
is explicitly deferred to PRD-17/PRD-20 by the PRD scope and Dev notes —
not a defect for this PRD.
