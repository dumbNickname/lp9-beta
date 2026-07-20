# PRD-24 — Pairing UX fixes (deep-link QR, copy, iOS scan fallback)

## Goal

Make pairing actually work on real devices. Fixes three defects found in
manual testing of the merged Phase 2 pairing flow (PRD-19..21):

1. **Manual pairing is dead.** The invite screen shows only the short
   8-char `code` under the QR, but the Join screen's manual paste needs
   the FULL payload `v1:<code>:<keyBase64>`. Pasting the short code hits
   `parseInvitePayload` -> null -> "not a valid invite". There is also no
   copy button, and the URL bar carries no invite info.
2. **iOS in-app scanning is dead.** `BarcodeDetector` is unsupported on
   iOS Safari/Chrome, so `QRScanner` shows "scanning not supported" with
   only the manual box (which is broken per #1).
3. **iOS native Camera can't use the QR.** The QR encodes raw text
   `v1:...`, so the iOS Camera app reports "No usable data found" — it
   only acts on URLs/known formats.

## Scope

**In:**
- **Deep-link invite URL (owner decision, `no-human-decisions.md`
  D-24.1):** the QR encodes an app URL with the payload in the URL
  fragment: `<origin><basePath>app#pair=<v1:code:keyB64>`. iOS native
  Camera recognizes the URL and opens the app; the app reads
  `#pair=` on load and auto-fills/auto-runs the join flow. The key rides
  in the fragment (`#`), which browsers never send to the server.
  - `src/lib/pairing/qr.ts`: add `buildInviteUrl(payload, origin?, basePath?)`
    and `parseInviteUrl(url): payload | null` (extract the `pair` fragment
    param, return the raw payload string; null if absent/malformed). Keep
    `buildInvitePayload`/`parseInvitePayload` unchanged (still the wire
    format inside the URL).
  - `InviteQR` encodes the URL (not the raw payload) in the QR.
- **Copy button + visible full payload** on the invite screen: show the
  full invite URL (or payload) in a selectable field with a "Copy" button
  (Clipboard API with a select-all fallback). This is what the partner
  pastes into Join. Keep showing the short `code` too for reference.
- **Join accepts URL or payload:** the manual box + scanner decode path
  runs input through a normalizer that accepts either a full invite URL
  (extract `#pair=`) or a bare `v1:...` payload, then `parseInvitePayload`.
- **iOS scan fallback:** add `html5-qrcode@2.3.8` (Apache-2.0, mature) as
  a fallback scanner used only when `BarcodeDetector` `isSupported()` is
  false. `scan.ts` gains a fallback path (or a sibling module) that runs
  html5-qrcode against the camera and emits the decoded string through the
  same `onDecode` contract. Native `BarcodeDetector` stays the preferred
  path. Lazy-import the lib so it never loads during SSR/prerender and
  isn't in the initial bundle for users who don't scan.
- **Deep-link handoff on app load:** when `/app` loads with a `#pair=`
  fragment, PairFlow (or the app gate) picks it up and drives the Join
  flow automatically (or pre-fills the Join view). Clear the fragment
  after consuming it so it doesn't linger/re-trigger.

**Out:**
- Changing the wire payload format (`v1:...` stays).
- The recovery/warning copy (PRD-22/23).
- Relationship switcher / multi-pair UI.

## Touched files / new files

- `src/lib/pairing/qr.ts` — add `buildInviteUrl`/`parseInviteUrl` +
  a `normalizeScannedInput(raw): payload | null` helper.
- `src/lib/pairing/scan.ts` (+ maybe `scan-fallback.ts`) — html5-qrcode
  fallback when `BarcodeDetector` absent.
- `src/components/InviteQR.tsx` — encode the URL; render copy button +
  selectable full-invite field.
- `src/components/QRScanner.tsx` — use fallback scanner when native
  unsupported; accept URL-or-payload manual input.
- `src/components/PairFlow.tsx` — normalize decode input; consume the
  `#pair=` deep link on mount.
- `package.json` — add `html5-qrcode@2.3.8`.

## Data model impact

None.

## UI behavior

Invite screen: QR (deep link) + a copyable full-invite field + short
code. Join screen: on iOS, camera scanning works via the fallback lib;
pasting either the URL or the payload pairs. Opening the deep link on a
phone launches the app and pairs (or pre-fills Join).

## Verification

1. `buildInviteUrl`/`parseInviteUrl` round-trip; `parseInviteUrl` returns
   null for URLs without a valid `#pair=` fragment; never throws.
2. `normalizeScannedInput` accepts a full invite URL, a bare `v1:...`
   payload, and returns null for junk — never throws.
3. Invite screen renders a Copy button; copying puts the full invite
   string on the clipboard (mock clipboard); short code still visible.
4. Join manual paste of BOTH a URL and a bare payload pairs (parse ok,
   redeem called with the right code).
5. When `BarcodeDetector` is absent, `QRScanner` uses the html5-qrcode
   fallback (mocked) rather than showing "not supported".
6. App loading `/app#pair=<payload>` auto-drives/pre-fills Join; fragment
   cleared after consume.
7. Owner device check: iOS native Camera opens the QR -> app -> pairs;
   in-app scan works on iOS; two-device pair succeeds end to end.

**Unit tests (Dev):**
- `qr.ts`: URL build/parse round-trip, `normalizeScannedInput` matrix,
  fragment extraction edge cases (no throw on junk).
- `InviteQR`: copy button present + clipboard write called.
- `QRScanner`: fallback selected when unsupported (mock both paths).
- `PairFlow`: `#pair=` on mount routes into Join + clears fragment.

**QA suite:**
- Adversarial: URL with injected/oversized fragment, missing `pair`,
  double `#`, encoded chars in key base64 survive round-trip; scanner
  fallback lib failure handled gracefully; key never appears in a
  network payload (fragment not sent); rapid scanner start/stop still
  releases the camera (fallback path too).

## Open questions

- Fragment vs query for the key: fragment (`#pair=`) chosen so the key is
  never sent to the server in a request line (D-24.1). Dev keeps it in
  the fragment.
- html5-qrcode camera lifecycle: ensure the fallback stops the camera on
  unmount/decode like the native path (no leaked stream). Dev records.

## Dev notes

### URL / fragment encode choice
- `buildInviteUrl(payload, opts?: { origin?; basePath? })` produces
  `<origin><basePath>app#pair=<encodeURIComponent(payload)>`.
  Example (real key with `+`/`/`/`=`):
  `https://example.com/lp9-beta/app#pair=v1%3AABCD1234%3A...%2B...%2F...%3D`.
- Followed the task's `opts` object signature (not the loose
  `(payload, origin?, basePath?)` in the PRD prose).
- `origin`: caller passes `window.location.origin` at runtime (InviteQR
  does); default reads `window.location.origin` when a window exists, else
  `""` (base-path-relative). No top-level window access — SSR/prerender
  safe.
- `basePath`: default from `import.meta.env.SERVER_BASE_URL || "/"` (wrapped
  in try/catch for the prerender Node process), normalized to exactly one
  leading + trailing slash.
- **Encode:** `encodeURIComponent` on build, `decodeURIComponent` on parse.
  Chosen because a fragment `+` can be read as a space and `/`/`=` get
  ambiguous once other `&`-joined params exist; uniform percent-encoding
  makes the base64 tail round-trip losslessly. Verified against a real
  32-byte key whose base64 has `+`/`/`/`=`.
- `parseInviteUrl(url)`: finds `#`, splits the fragment on `&`, returns the
  `decodeURIComponent`'d value of the `pair` key (supports combined
  fragments like `#a=1&pair=...`). Returns null on no fragment / no `pair` /
  empty value / malformed percent-encoding. Never throws.
- `normalizeScannedInput(raw)`: if the input contains `#`, treat as a URL
  and require a valid `pair=` (null otherwise); else return the trimmed
  string as a bare payload. It does NOT validate payload format — the
  downstream `parseInvitePayload` does. Never throws.

### Scanner: native vs fallback wiring + lazy import
- `scan.ts` keeps `isSupported()` (native BarcodeDetector check) and adds an
  `isNativeSupported` alias. A scanner is now ALWAYS available in the
  browser, so the old `"unsupported"` dead-end state is removed from
  QRScanner.
- New `scan-fallback.ts` exports `startFallbackScan({ container, onDecode,
  onError })`. It **lazy** `await import("html5-qrcode")` INSIDE the start
  function — never at module top level — so the lib is a separate client
  chunk and never enters the SSR/prerender graph. Uses the low-level
  `Html5Qrcode` class (not `Html5QrcodeScanner`), which renders its own
  video into a container addressed by `id`.
- `QRScanner` picks the path on mount: `isNativeSupported()` -> `startNative`
  (owns `<video>` + `MediaStream` + native `startScan`); else
  `startFallback` (html5-qrcode owns the camera, renders into a container
  `div` with a `createUniqueId()` id). Both funnel the first decode through
  the same `onDecode` prop unchanged; PairFlow normalizes.
- **Camera release / cleanup:** native path — `scanner.stop()` stops all
  MediaStream tracks (+ defensive raw-stream release). Fallback path —
  `stop()` is idempotent and calls html5-qrcode `.stop()` (halts the stream)
  then `.clear()` (tears down DOM), both guarded. `onCleanup` sets a
  `disposed` flag and calls `cleanup()`; start functions check `disposed`
  after their async gaps and stop immediately if unmounted mid-start (covers
  rapid start/stop / unmount-before-start-resolves). Decode also stops the
  scanner before firing `onDecode`.

### Clipboard (InviteQR)
- Prop shape changed from `{ payload, code }` to `{ code, keyBase64 }`;
  InviteQR builds the payload + URL internally. PairFlow usage updated.
- QR canvas now encodes the deep-link URL (not the raw payload).
- Selectable read-only `<textarea>` shows the full invite URL; "Copy invite
  link" button uses `navigator.clipboard.writeText` in try/catch; on failure
  or no clipboard API it focuses+selects the field so the user can copy
  manually. Transient "Copied" state (2s). Short `code` still shown for
  reference.

### Deep-link consume + clear
- PairFlow `onMount`: pending-invite (inviter) resume runs FIRST and returns
  if present. Only when there is no outstanding invite does it consume a
  `#pair=` deep link (joiner path): `parseInviteUrl(window.location.href)`,
  then `history.replaceState(null, "", pathname+search)` to strip the
  fragment so it can't re-trigger, then `setView("join")` +
  `handleDecode(payload)`. All window/history access guarded for SSR. A
  device is inviter XOR joiner, so the two paths never conflict.
- `handleDecode` now runs input through `normalizeScannedInput` before
  `parseInvitePayload`, so URL-or-payload both work from scanner, deep link,
  and manual paste.

### Package
- Added `html5-qrcode@2.3.8` (Apache-2.0). Installed cleanly, no native
  build script -> no `pnpm-workspace.yaml` `allowBuilds` change needed, no
  `minimumReleaseAge`/`strictDepBuilds` block.

### Self-test results
- `pnpm typecheck` PASS.
- `pnpm lint` PASS (0 warnings).
- `pnpm test` for `tests/unit`: PASS (109/109; 20 files). New/extended:
  `pairing-invite-url.test.ts`, `invite-qr.test.tsx`, `qr-scanner.test.tsx`,
  `pair-flow.test.tsx`.
- `pnpm build` PASS: static preset, `.output/server` absent, all 4 routes
  prerendered. Confirmed html5-qrcode impl (`Html5QrcodeScanner`/`getCameras`)
  is 0 refs in the main app entry and isolated in a separate lazy client
  chunk; 0 refs in the SSR/server-fns bundle -> not in the initial bundle,
  not in prerender.

### Gotcha for QA (contract change — needs QA action)
- **The full `pnpm test` has ONE failing test: `tests/qa/
  qr-scanner.adversarial.test.tsx` > "getUserMedia absent -> unsupported
  notice".** This is a QA-owned file (Dev is not permitted to edit
  `tests/qa/`). PRD-24 intentionally REMOVES the "scanning is not supported"
  dead-end — a scanner is now always attempted (native or html5-qrcode
  fallback). The PRD-20 QA test asserting the old copy is now testing
  removed behavior. This is a legitimate contract change directly mandated
  by PRD-24 (mirrors the D-22.3 precedent where a merged QA test was updated
  after a contract change; DESIGN §16c: test the contract, not incidentals).
  QA should update/replace that assertion (e.g. native-supported +
  getUserMedia-absent now yields the "unavailable" notice via the `denied`
  state, and manual entry still works). Dev did NOT touch it.

### Owner iOS device checks still needed (QA/owner)
- iOS native Camera app scans the QR -> opens the app at
  `.../app#pair=...` -> auto-routes to Join and pairs; fragment cleared.
- In-app scanning on iOS Safari/Chrome uses the html5-qrcode fallback
  (BarcodeDetector absent) and actually decodes from the camera.
- Rapid start/stop and unmount during scan release the camera on the
  fallback path too (no leaked stream / camera light stays off after
  leaving Join).
- Full two-device pair end to end (invite on device A, scan/deep-link on
  device B), and that the key never appears in any network request (it
  rides only in the URL fragment).
- Verify `SERVER_BASE_URL`-derived basePath in the built invite URL matches
  the deployed sub-path (`/lp9-beta/`) so the deep link resolves.

## QA findings

**Result: PASS -> `qa-done`.** All four gates green:
`pnpm typecheck` PASS, `pnpm lint` PASS (0 warnings), `pnpm test` PASS
(293/293 across 39 files), `pnpm build` PASS (static preset,
`.output/server` = 0 files, all 4 routes prerendered). gitleaks clean on
tracked history and on the new QA test files (the only working-tree hit is
the gitignored local `.env`, which is never committed).

### Verification table

| Step | Result | Notes |
|------|--------|-------|
| 1. `buildInviteUrl`/`parseInviteUrl` round-trip, null on no-fragment, never throws | PASS | `tests/qa/pairing-invite-url.adversarial.test.ts` — 500-key fuzz round-trip incl. `+`/`/`/`=`; 19 null/edge inputs, all null, no throw. |
| 2. `normalizeScannedInput` accepts URL + bare payload, null on junk, never throws | PASS | Same file — full matrix incl. oversized (50k) fragment, `#`-in-payload, non-string inputs. |
| 3. Invite screen Copy button copies full invite, short code visible | PASS | `tests/qa/invite-qr.adversarial.test.tsx` — copies full URL (not short code), payload with real key survives; short code still shown. |
| 4. Join manual paste of URL AND bare payload both pair (redeem gets right code) | PASS | Covered by Dev unit `qr-scanner.test.tsx` + reinforced by deep-link redeem-with-parsed-code assertions. |
| 5. `BarcodeDetector` absent -> html5-qrcode fallback (not "not supported") | PASS | `tests/qa/qr-scanner-fallback.adversarial.test.tsx` — fallback attempted, native not called, no dead notice. |
| 6. `/app#pair=<payload>` auto-drives Join + clears fragment | PASS | `tests/qa/pair-flow-deeplink.adversarial.test.tsx` — routes to Join, redeems parsed code, stores key, `location.hash === ""` (no lingering `pair=`). |
| 7. Owner iOS two-device end-to-end device check | DEFERRED (owner) | Requires physical iOS hardware; out of automated QA reach. Flagged for owner. |

### Reconciliation of the merged PRD-20 QA test (authorized)

`tests/qa/qr-scanner.adversarial.test.tsx` line ~192 ("getUserMedia absent
-> unsupported notice") asserted the now-removed "scanning is not supported"
dead-end. Per the orchestrator's authorization and the PRD-24 contract
change (a scanner is now always attempted; native path degrades to the
"unavailable" notice, fallback path used when `BarcodeDetector` absent), the
assertion was re-pointed to the new contract: native-supported +
getUserMedia-absent now yields the "unavailable" notice, the removed "not
supported" copy must be ABSENT, and manual entry stays usable. No unrelated
assertions in that file were weakened; it remains adversarial (still 18
tests, all pass). The distinct "fallback attempted when native absent" case
is covered adversarially in the new `qr-scanner-fallback` suite.

### Adversarial tests added (`tests/qa/`)

- **`pairing-invite-url.adversarial.test.ts`** (16 tests): URL build/parse
  round-trip (incl. 500-key fuzz and a payload full of `&`/`#`/`?`/`=`/space
  that `encodeURIComponent` must escape); parse null-safety on 19
  malformed/missing-pair/non-string inputs (never throws); combined
  `#a=1&pair=...` fragments; malformed percent-encoding rejected cleanly;
  `normalizeScannedInput` matrix (URL, bare payload, extra params, oversized,
  junk, non-string). **Key-in-fragment-not-query proof:** `buildInviteUrl`
  output has no `?`, the code/key/`pair=` never appear before `#`, path is
  exactly `<origin><base>app`, and even a `=`-padded key is percent-encoded
  so it can't be promoted to a query.
- **`invite-qr.adversarial.test.tsx`** (4 tests): Copy button copies the FULL
  deep-link URL (its fragment decodes to the full `v1:code:key` payload; key
  with `+`/`/`/`=` untruncated), not the short code; clipboard `writeText`
  REJECT path does not crash and selects the field surfacing the full invite;
  no-clipboard-API path likewise.
- **`pair-flow-deeplink.adversarial.test.tsx`** (6 tests): `#pair=<valid>`
  routes to Join, redeems with the PARSED code only (no key/base64 on the
  wire), imports+stores key under returned rel id, clears the fragment
  (`hash === ""`); fragment cleared even when redeem REJECTS; `#pair=<junk>`
  -> no redeem, no key stored, no crash; `#foo=bar` ignored (stays landing);
  normal mount unaffected (no fragment mutation); inviter-XOR-joiner (a
  pending invite resumes waiting and the deep link is NOT consumed).
- **`scan-fallback.adversarial.test.ts`** (8 tests): lazy `import("html5-qrcode")`
  wired against the container id; first decode forwards RAW string + auto-stops
  (stop + clear = camera released); spurious second decode ignored; explicit
  `stop()` releases; `stop()` idempotent (double/triple); stop-after-auto-stop
  no double-release; stop after a slow start still releases exactly once;
  start() failure surfaces via `onError`, rejects, leaves no running camera.
- **`qr-scanner-fallback.adversarial.test.tsx`** (6 tests): native path
  selected when `BarcodeDetector` present (getUserMedia requested, fallback
  NOT attempted); fallback attempted when absent (container + onDecode passed,
  no "not supported"); unmount mid-scan releases the camera on BOTH paths
  (incl. unmount BEFORE the fallback `start()` resolves -> the `disposed`
  guard still calls `stop()`); fallback start rejection settles to the
  "unavailable" notice with manual entry usable.

### Bundle / SSR isolation (spot-checked on the fresh build)

- html5-qrcode is `import("./index-...js")` (dynamic/lazy) from the app
  chunk; the ~375 KB library body is isolated in its own client chunk, NOT
  in the app entry.
- **0** references to `Html5Qrcode`/`html5-qrcode`/`getCameras` in the
  SSR (`.vinxi/build/ssr`) and server-fns bundles -> never enters the
  prerender graph or the initial bundle. Dev's "0 refs" claim confirmed.

### Non-blocking observations (not PRD-24 defects)

- **Native camera decode path + jsdom ref timing:** in jsdom, the `<video>`
  ref inside the `<Show>` is not observed after the `getUserMedia` await, so
  `startNative` hits its `if (!video || disposed)` guard, releases the
  stream, and returns without calling `startScan`. This behavior is
  IDENTICAL in the merged PRD-20 `QRScanner` (verified via
  `git show 7995e7a`) — PRD-24 did not introduce or change it, and PRD-24's
  scope is the fallback path + path selection. The camera stream is still
  released (no leak), which is the invariant the fallback suite asserts.
  Whether the native path decodes in a real browser is a pre-existing
  PRD-20 question, not a PRD-24 regression; logged here for the orchestrator.
- **Deep-link browser-history exposure of the key** is a known, owner-
  accepted tradeoff (D-24.1), not a defect.
- Step 7 (physical iOS two-device end-to-end + `/lp9-beta/` basePath in the
  deployed URL) is owner/device verification outside automated QA.

