# PRD-20 — QR scanning (camera + manual-code fallback)

> Status: see `PROGRESS.md`. Later changes: see below.

## Goal

Let the joiner scan the inviter's QR (or paste the invite manually) to
obtain the pairing code + key for redemption.

## What shipped

- In-app camera scan via the native `BarcodeDetector` API, with
  feature detection; no detection when absent (SSR or unsupported).
- Camera permission asked only on the client; denial or no camera shows
  a friendly notice plus the manual path, never a crash.
- Manual fallback takes the **full invite payload** `v1:<code>:<keyB64>`
  (what the QR encodes), validated with the PRD-19 parser; invalid input
  shows "That does not look like a valid invite." and does not proceed.
- Camera decodes are forwarded raw; parsing is the caller's job
  (PRD-21). Only the manual path validates in place.
- Camera lifecycle: scanning stops on first decode, on stop and on
  unmount; every camera track is released; stop is idempotent.
- Out: payload parsing (PRD-19), redeem RPC + key storage (PRD-21).

## Decisions

- **D-20.1** Manual fallback = paste the full payload. A short code
  alone cannot carry the key, and note E2E needs the key on both
  devices. Owner's profile-ID idea was set aside: it fits no code-based
  RPC and transfers no key.
- **D-20.2** Native `BarcodeDetector` only, no scan library: manual paste
  covered the unsupported case; fewer deps. Revisit if real devices need
  it (they did, see Later changes).

## Verification

- Unit + QA adversarial: feature detection exact and SSR-safe; raw value
  forwarded verbatim; no leaked tracks under rapid start/stop churn;
  non-invite QR/paste rejected; denial and no-camera paths stay usable.
- Full camera decode cannot run in jsdom; real-device scan was an owner
  check under PRD-21.

## Gotchas

- `BarcodeDetector` is not in the TS DOM lib; a minimal local type is
  used. Never touch it or `navigator` at module load (prerender).

## Later changes

- iOS lacks `BarcodeDetector`: `html5-qrcode@2.3.8` was added as a
  lazy-loaded fallback scanner (PRD-24, D-24.1), partly reversing D-20.2.
- Join input accepts either a full invite URL (`#pair=`) or a bare `v1`
  payload (PRD-24).
- Scan/paste no longer redeems directly; it opens a confirm step
  (PRD-25, D-25.1).
