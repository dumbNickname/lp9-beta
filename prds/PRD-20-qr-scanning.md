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
