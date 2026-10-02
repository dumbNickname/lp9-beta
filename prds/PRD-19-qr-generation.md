# PRD-19 — QR generation (invite payload with embedded key)

> Status: see `PROGRESS.md`. Later changes: see below.

## Goal

Generate a QR code carrying the pairing `code` plus the base64
per-relationship key, so scanning it pairs and transfers the key in one
step (`DESIGN.md` §12a, §13a).

## What shipped

- Invite payload wire format **`v1:<code>:<keyBase64>`**: compact,
  versioned, delimited. Key uses standard base64 (`+ / =`, never `:`).
- Parser splits on the first two colons only; everything after the
  second colon is the key verbatim, so it is never truncated.
- Parser never throws; returns null for non-strings, wrong/absent
  version (`v2:`, `V1:`), missing parts, empty code or empty key.
- Parser does not validate base64 shape or key length; that belongs to
  key import on the join side.
- Invite QR rendered client-side to a canvas, with a text fallback if
  rendering fails.
- Out: scanning (PRD-20), key generation/storage (PRD-17/18), pair-flow
  orchestration (PRD-21).

## Decisions

- **D-19.1** Payload format `v1:<code>:<keyB64>`. Base64 never contains
  `:`, so it is unambiguous and lossless; smaller QR than JSON. Version
  prefix leaves room for `v2:`.
- **D-19.2** QR library `qrcode@1.5.4` (MIT, generation-only), pinned
  exact. Owner picked it over `qr-code-styling` (styling not needed).

## Verification

- Unit + QA adversarial: round-trip lossless for real AES keys, random
  key fuzz and all padding lengths; ~60 malformed inputs return null
  without throwing; extra colons stay in the key.
- Render smoke test mocks the QR lib (jsdom canvas has no 2d context);
  real scannability was an owner device check under PRD-21.

## Later changes

- QR now encodes a deep-link URL `<app>#pair=<v1 payload>` instead of
  the raw payload; the `v1` format is unchanged inside it (PRD-24,
  D-24.1).
- The short manual code under the QR was dropped; QR and copyable
  invite link are the shareables (PRD-25, D-25.3).
