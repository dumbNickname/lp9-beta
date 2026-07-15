# PRD-18 — IndexedDB per-relationship key store

## Goal

Persist and retrieve the per-relationship AES-GCM key in IndexedDB,
keyed by relationship id, never sending it to Supabase in plaintext.

## Scope

**In:**
- `src/lib/crypto/keystore.ts`:
  - `putKey(relationshipId: string, key: CryptoKey): Promise<void>`.
  - `getKey(relationshipId: string): Promise<CryptoKey | null>`.
  - `deleteKey(relationshipId: string): Promise<void>` (for account
    delete / unpair, §12d).
  - `hasKey(relationshipId): Promise<boolean>`.
  - Small IndexedDB wrapper (no library, or a tiny permissive-license
    one — prefer none; flag if a helper is warranted).
- Store `CryptoKey` objects directly (structured-clone supports
  non-extractable keys) OR raw bytes — Dev picks and records.

**Out:**
- Key generation / crypto ops (PRD-17).
- Password-wrapped recovery blob on Supabase (PRD-22).
- UI (PRD-21).

## Touched files / new files

- `src/lib/crypto/keystore.ts` — new.

## Data model impact

None (IndexedDB is client-local; no Supabase schema).

## UI behavior

None.

## Verification

1. `putKey` then `getKey` returns a usable key that decrypts data
   encrypted with the original (round-trip via PRD-17 helpers).
2. `getKey` for an unknown relationship returns null.
3. `deleteKey` removes it; subsequent `getKey` returns null.
4. Key persists across a simulated reload (new IndexedDB connection).
5. Key is never serialized to any network call (code review + grep: no
   key material leaves `src/lib/crypto/**` except into the QR payload in
   PRD-19).

**Unit tests (Dev):**
- `tests/unit/crypto-keystore.test.ts`: put/get/delete/has round-trips
  using `fake-indexeddb` (dev-only) or the jsdom IndexedDB if present.
  Document the choice in Dev notes.

**QA suite:**
- Adversarial: two relationships' keys don't collide; deleting one keeps
  the other; corrupt/missing store handled without throwing on read.

## Open questions

- Store `CryptoKey` directly (structured clone) vs raw bytes? Dev
  decides (structured clone is simpler and keeps keys non-extractable)
  and records.
- Test IndexedDB: does jsdom provide it, or is `fake-indexeddb` needed
  (dev dependency, check `minimumReleaseAge`)? Dev records.
