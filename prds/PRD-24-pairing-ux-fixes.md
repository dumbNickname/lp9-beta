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
