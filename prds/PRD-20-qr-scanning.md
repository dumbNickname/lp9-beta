# PRD-20 — QR scanning (camera + manual-code fallback)

## Goal

Let a redeemer scan the inviter's QR (or paste the manual code) to
obtain the pairing code + key for redemption.

## Scope

**In:**
- Scanning via the browser **`BarcodeDetector` API** where available,
  with a fallback library (`html5-qrcode`) only if needed — prefer the
  native API to avoid a heavy dependency. Verify license /
  `minimumReleaseAge` if a lib is added. Record choice.
- `src/lib/pairing/scan.ts` — thin wrapper: start/stop a scan, emit the
  decoded string; feature-detect and expose `isSupported()`.
- `src/components/QRScanner.tsx`:
  - Camera permission prompt UX; handle denial gracefully.
  - On decode, hand the raw payload to a callback (parsed via PRD-19
    `parseInvitePayload`).
  - **Manual-code fallback:** a text input to paste the code when camera
    is unavailable/denied (key must then be entered too — see Open
    questions).

**Out:**
- Payload parsing (PRD-19 owns build/parse).
- Redemption RPC call + key storage orchestration (PRD-21).

## Touched files / new files

- `src/lib/pairing/scan.ts` — new.
- `src/components/QRScanner.tsx` — new.
- `package.json` — only if a fallback scan lib is required.

## Data model impact

None.

## UI behavior

Camera view with permission prompt; on scan, fires callback with decoded
payload. If camera denied/unavailable, a manual entry path is shown.

## Verification

1. `isSupported()` correctly reflects `BarcodeDetector` availability.
2. On a supported device, scanning a PRD-19 QR yields the exact payload
   string (owner device check in PRD-21).
3. Camera permission denial shows a friendly message + manual fallback,
   no crash.
4. Manual entry path accepts a pasted code (and key, if required).

**Unit tests (Dev):**
- `tests/unit/pairing-scan.test.ts`: `isSupported()` feature-detection
  (mock `BarcodeDetector` presence/absence); wrapper emits decoded
  string from a mocked detector.
- Component smoke: `QRScanner` renders, shows manual fallback when
  `isSupported()` is false.

**QA suite:**
- Adversarial: permission denied mid-scan; scanning a non-invite QR
  (parse null → user-facing "not a valid invite"); rapid start/stop
  doesn't leak camera streams.

## Open questions

- Manual fallback: since the key rides in the QR, a pasted **code alone**
  cannot recover the key. Options: (a) manual path also asks for the key
  string, or (b) manual path is code-only and the key comes via recovery
  password later. Dev decides per §12b intent and records; flag to owner
  if UX-significant.

## Dev notes

**Scan mechanism: native `BarcodeDetector` only — NO library added.**
The manual full-payload paste fallback fully covers the
unsupported/denied path, so a heavy dep (`html5-qrcode`) was not
genuinely needed. `package.json` unchanged. If a future device-coverage
gap makes a fallback lib necessary, it should be added in a separate PRD
with license + `minimumReleaseAge` checks.

**Manual fallback resolution (orchestrator-locked):** the manual input
takes the **full invite payload string** `v1:<code>:<keyB64>` — the exact
thing the QR encodes — NOT code-only and NOT a profile ID. It is parsed
in-component via PRD-19 `parseInvitePayload`: on `null` the user sees
"That does not look like a valid invite." and `onDecode` does NOT fire;
on success the **raw payload string** is forwarded through the same
`onDecode(payload)` callback a camera scan uses. This sidesteps the
Open-questions key-recovery problem entirely: the key always rides in the
payload, whether scanned or pasted.

**SSR / prerender safety (AGENTS.md gotcha):** this app prerenders in a
separate Node process. `scan.ts` never touches `window`/`navigator`/
`BarcodeDetector` at module top level — `isSupported()` reads
`globalThis.BarcodeDetector` lazily inside the function and returns
`false` when absent (SSR/unsupported). `QRScanner.tsx` only requests the
camera inside `onMount` (client-only) and guards `navigator.mediaDevices`
before use. `pnpm build` prerenders `/app` cleanly, confirming no
load-time global access.

**BarcodeDetector types:** not in the TS DOM lib, so `scan.ts` declares a
minimal structural interface for the surface it uses (`detect()` →
`{ rawValue }[]`). No `@types` dep needed.

**Camera lifecycle / stream leaks:** `startScan` returns a `Scanner` with
an idempotent `stop()` that clears the poll timer and stops every
`MediaStream` track. It self-stops on first decode. `QRScanner` calls
`cleanup()` in `onCleanup` (unmount) and after a successful decode;
`cleanup()` also defensively stops a raw stream captured before
`startScan` ran (e.g. unmount during the `getUserMedia` await).

**Styling:** semantic class names + existing theme tokens only. Per the
PRD "Touched files" scope (`scan.ts`, `QRScanner.tsx`, `package.json`),
`src/styles/global.css` was intentionally NOT modified — consistent with
`InviteQR`/`Onboarding`, which likewise carry semantic classes not yet in
`global.css`. Logical CSS / token styling can be added when the pair-flow
screens land (PRD-21) without expanding this PRD's scope.

**Self-test results (all green):**
- `pnpm typecheck` — clean (`tsc --noEmit`, no output).
- `pnpm lint` — clean (`eslint . --max-warnings 0`, no output).
- `pnpm test` — 11 files, 58 tests pass (2 new files: `pairing-scan`
  4+3 tests, `qr-scanner` 4 tests).
- `pnpm build` — static build OK; prerendered 4 routes; `.output/public`
  has `index.html`; `.output/server` is an empty dir (fine for static
  preset).

**Gotchas for QA:**
- jsdom has neither `BarcodeDetector` nor `getUserMedia`. Tests toggle
  `globalThis.BarcodeDetector` (save/restore in `afterEach`) and mock a
  fake `MediaStream` with `getTracks()` returning tracks whose `stop` is a
  spy. To exercise the camera path, mock `navigator.mediaDevices
  .getUserMedia` too.
- The detector loop is `setTimeout`-polled; the "stop stops tracks" test
  uses `vi.waitFor` on `detect` being called before calling `stop()`.
- Camera-scan payloads are forwarded **raw and unvalidated** (parsing is
  the caller's job, PRD-21) — only the *manual* path validates in-
  component. This is intentional per PRD-19 ownership.
- Redemption RPC + IndexedDB key storage are out of scope (PRD-21); this
  component's contract ends at `onDecode(payload)`.

## QA findings

**Verdict: PASS → `qa-done`.** All four gates green
(`pnpm typecheck && pnpm lint && pnpm test && pnpm build`); 89 tests
pass (31 new QA adversarial). `.output/server` is an empty dir (no
server runtime); static build prerendered 4 routes cleanly, confirming
`scan.ts`/`QRScanner.tsx` SSR-safety. `gitleaks detect` (33 commits):
no leaks.

### Verification steps

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | `isSupported()` reflects `BarcodeDetector` availability | PASS | QA verified true only for a constructor; false for absent/undefined/null/non-function/object/string/number/array; never throws; SSR-safe (returns false with no global). |
| 2 | Scanning a PRD-19 QR yields exact payload | PASS (unit-level) | Verified at the `scan.ts` layer: `startScan` forwards the raw `rawValue` verbatim (incl. `+ / =` tail) via `onDecode`, then self-stops. Full camera→`getUserMedia`→decode path is NOT reproducible in jsdom (see note below) and is a real-device / PRD-21 check per the PRD. |
| 3 | Permission denial → friendly message + manual fallback, no crash | PASS | `getUserMedia` rejection routes to the `denied` state, shows the "Camera access is unavailable" notice (`role=status`), no throw escapes, and the manual paste path still fires `onDecode` afterward. |
| 4 | Manual entry accepts a pasted payload (key rides in it) | PASS | Valid `v1:<code>:<keyB64>` (incl. a real 32-byte AES key with `+ / =`) fires `onDecode` with the RAW string; garbage rejected with "not a valid invite"; empty/whitespace prompts, never a success. |

### Adversarial tests written

- `tests/qa/pairing-scan.adversarial.test.ts` (19 tests) — `scan.ts`:
  - `isSupported()` exactness (constructor/function true; absent/null/
    non-function false), never-throws, SSR-safe.
  - `startScan` returns null when unsupported and never touches the
    stream (no spurious track stop).
  - **Camera-leak prevention:** auto-stop on first decode releases
    *every* track exactly once (multi-track streams); explicit `stop()`
    releases all tracks and halts the poll loop (verified detect-count
    frozen after stop); `stop()` idempotent (double/triple-stop);
    `stop()` after auto-stop is a no-op; **25x rapid start/stop churn
    leaks no tracks**; transient `detect()` rejection keeps the loop
    alive without leaking; raw string forwarded verbatim.
- `tests/qa/qr-scanner.adversarial.test.tsx` (12 tests) — component:
  - Non-invite QR/paste rejection for `https://…`, `v2:…`, wrong-case
    `V1:…`, WIFI-QR format, SQL-ish payload, empty-field variants —
    each shows "not a valid invite" and does NOT fire `onDecode`.
  - Empty/whitespace-only input shows a prompt, not a success.
  - Valid manual paste forwards the RAW payload untruncated for a real
    32-byte AES key base64 (`+ / =`); leading/trailing whitespace
    trimmed; interior whitespace preserved.
  - `getUserMedia` rejection → graceful `denied` state + working manual
    fallback; `getUserMedia` absent → `unsupported` notice + manual
    usable; no throw in either.

### Notes / non-defects

- **Camera happy-path not asserted in jsdom (harness limitation, not a
  bug).** The full mount→`getUserMedia`→`<video>`→scan flow is not
  reliably reproducible under jsdom: (a) jsdom's `HTMLMediaElement.play()`
  and `srcObject` are unimplemented, and (b) the SolidJS `ref`-inside-
  `<Show>` assignment timing under an async `onMount` differs between an
  imported `src/` module and an inline test component. QA reproduced the
  component's exact source inline and confirmed the `video` ref *is*
  correctly assigned before the `getUserMedia` continuation (the only
  failure was jsdom's unimplemented `play()`/`srcObject`), so the
  early-return `!video` guard is defensive, not a logic error. The
  decode+release contract is instead proven directly at the `scan.ts`
  layer with an injected video/stream. This matches the PRD scoping
  Verification step 2 to "on a supported device" and Dev's noted jsdom
  gap. No production-code defect found.
- Camera-scan payloads are forwarded raw/unvalidated by design (parsing
  is PRD-21); only the manual path validates in-component. QA confirms
  this boundary rather than treating it as a gap.

**No defects found.**
