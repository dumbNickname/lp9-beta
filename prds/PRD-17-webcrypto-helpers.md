# PRD-17 — WebCrypto helpers (AES-GCM encrypt/decrypt)

> Status: see `PROGRESS.md`.

## Goal

Provide dependency-free WebCrypto helpers to generate a per-relationship
AES-GCM key and encrypt/decrypt note text (`DESIGN.md` §12a).

## What shipped

- Generate an AES-GCM 256-bit key per relationship.
- Raw export/import of the key, for embedding in the invite QR/link
  (base64) and storing on device.
- Encrypt a string -> `{ ciphertext, iv }` with a fresh random 12-byte
  IV per message; decrypt back to the string.
- base64 <-> bytes helpers for transport.
- WebCrypto only; no third-party crypto library (§12a, HANDOFF 2.3).
- Wrong key, wrong IV or tampered ciphertext fails loudly (GCM auth
  failure), never silent garbage.
- Out: on-device key storage (PRD-18), password-wrapped recovery
  (PRD-22), note send/read wiring (Phase 3), QR embedding (PRD-19).

## Decisions

- 12-byte IV per message (AES-GCM standard); never reused.
- Keys are extractable so they can go into the QR payload (PRD-19) and
  device storage (PRD-18).
- base64 via `btoa`/`atob` with byte-string bridging (browser-safe).
- Tests use the Node-provided `crypto.subtle` in jsdom; no polyfill or
  dependency needed.

## Verification

- Unit: UTF-8 round-trip (incl. emoji and 200-char notes, §12c),
  distinct IVs and ciphertexts for the same plaintext, wrong-key and
  tamper failures, key export/import and base64 round-trips.
- QA: truncated/oversized IV, empty plaintext, mismatched IV fail
  cleanly.
