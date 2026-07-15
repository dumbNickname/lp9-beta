# PRD-17 — WebCrypto helpers (AES-GCM encrypt/decrypt)

## Goal

Provide dependency-free WebCrypto helpers to generate a per-relationship
AES-GCM key and encrypt/decrypt comment text, per `DESIGN.md` §12a.

## Scope

**In:**
- `src/lib/crypto/aes.ts`:
  - `generateKey(): Promise<CryptoKey>` — AES-GCM 256-bit.
  - `exportKeyRaw(key)` / `importKeyRaw(bytes)` — for QR embedding
    (base64) and IndexedDB storage.
  - `encrypt(key, plaintext: string): Promise<{ ciphertext: Uint8Array,
    iv: Uint8Array }>` — fresh 12-byte IV per message.
  - `decrypt(key, ciphertext, iv): Promise<string>`.
  - base64 <-> bytes helpers for transport.
- **No third-party crypto library** (WebCrypto only), per §12a and
  HANDOFF 2.3.

**Out:**
- IndexedDB persistence of the key (PRD-18).
- Password-wrapping / PBKDF2 recovery (PRD-22).
- Any comment send/read wiring (Phase 3).
- QR embedding of the key (PRD-19).

## Touched files / new files

- `src/lib/crypto/aes.ts` — new.

## Data model impact

None.

## UI behavior

None (pure lib).

## Verification

1. `generateKey` produces a usable AES-GCM key.
2. `encrypt` then `decrypt` round-trips arbitrary UTF-8 (incl. emoji,
   200-char strings per §12c) back to the original.
3. Each `encrypt` uses a distinct IV; same plaintext yields different
   ciphertext across calls.
4. Decrypting with the wrong key or tampered ciphertext throws (GCM auth
   failure), not silent garbage.
5. `exportKeyRaw`/`importKeyRaw` round-trips a key; base64 helpers
   round-trip bytes.

**Unit tests (Dev):**
- `tests/unit/crypto-aes.test.ts`: round-trip, distinct IVs, wrong-key
  failure, tamper failure, export/import round-trip, base64 round-trip.
- Note: jsdom may lack full WebCrypto subtle — verify the test env
  provides `crypto.subtle`; if not, document a Node/polyfill approach in
  Dev notes.

**QA suite:**
- Adversarial: truncated/oversized IV, empty plaintext, non-UTF8 bytes,
  decrypt with mismatched IV → all fail cleanly.

## Open questions

- Does the Vitest jsdom environment expose `crypto.subtle`? If not, Dev
  records the chosen fix (Node webcrypto global, or a test-env tweak)
  rather than adding a crypto dependency.

## Dev notes

**File:** `src/lib/crypto/aes.ts`

**crypto.subtle in tests:** Node provides `globalThis.crypto.subtle`
natively in the jsdom env — no polyfill or dependency needed. Verified
with a probe test.

**Choices:**
- 12-byte IV per message (AES-GCM standard).
- Keys are extractable (`true`) so they can be exported for QR embedding
  (PRD-19) and IndexedDB (PRD-18).
- base64 via `btoa`/`atob` with byte-string bridging (browser-safe).

**Self-test:** typecheck, lint, 23/23 tests (7 new: round-trip, emoji,
200-char, distinct IV, wrong-key fail, tamper fail, export/import,
base64), build all pass.
