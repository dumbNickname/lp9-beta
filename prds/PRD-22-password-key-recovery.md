# PRD-22 — Password-wrapped key recovery

> Status: see `PROGRESS.md`. Later changes: see below.

## Goal

Let a user set a recovery password that wraps the per-relationship key
into a blob stored on Supabase, and unwrap it on a new device, so notes
survive device loss without the server ever seeing the key or password
(`DESIGN.md` §12b).

## What shipped

- Crypto: PBKDF2-SHA256, **600000 iterations**, random **16-byte salt**
  per relationship, derives an AES-GCM wrapping key. The raw relationship
  key is AES-GCM encrypted; `wrapped_key_blob = iv (12 bytes) ||
  ciphertext` = exactly 60 bytes for an AES-256 key.
- RPC `set_recovery_password(p_rel_id, p_wrapped_blob, p_salt,
  p_iterations, p_algo)`: security definer, empty search path,
  `auth.uid()` and `is_relationship_member` guards before the write;
  updates only `wrapped_key_blob`, `wrap_salt`, `wrap_iterations`,
  `wrap_algo` (`'PBKDF2-SHA256'`). Covers first set and change.
- Only blob, salt, iterations and algo cross the wire; password and
  plaintext key never leave the client.
- Three modes: **set** (one-time prompt after pairing), **change**
  (Settings; re-wraps the local key with a new password and fresh salt,
  no old password needed), **restore** (new device: fetch blob, enter
  password, unwrap, store key in IndexedDB).
- Set always uses 600k; restore uses the stored iteration count only as
  a derivation input, so a downgraded value just fails to unwrap.
- Wrong password or tampered blob: GCM auth fails, "Couldn't unlock...",
  no key stored. No password set: friendly message. No local key in set
  mode: "not available on this device", no RPC.
- Prompt shown once per relationship (`recovery_prompted:<relId>` in
  localStorage), skippable, alongside the dashboard, not blocking it.
- bytea is sent and read as `\x` hex text (PostgREST default); the
  decoder also accepts byte arrays.
- Out: honest warning copy (PRD-23); account linking (recovery is
  password-based and independent of login, §12b).

## Decisions

- **D-22.0** No Supabase Vault/pgsodium: its server-held root key would
  let the server decrypt, breaking E2E. Client-side wrap stays.
- **D-22.1** Wrap = AES-GCM encrypt of raw key bytes, `iv || ciphertext`.
  Reuses existing AES-GCM code; auth tag gives tamper detection.
  Alternative: AES-KW via `wrapKey` (separate algo path).
- **D-22.2** Prompt is skippable with the honest data-loss warning;
  forcing it would block pairing. Skipped = notes unrecoverable on
  device loss until a password is set in Settings.
- **D-22.3** Prompt lives in the app shell, not gating PairFlow: pairing
  refreshes the relationship at once, so there is no "DB has pair, store
  doesn't" gap. Owner approved the scope expansion.

## Honest wording rules

- Forgotten password = old notes unreadable forever; no backdoor.
- Login does not help key recovery; the key was never on the server.
- Warning shows in set and change, not in restore (PRD-23).

## Verification

- Unit + QA adversarial: round-trip recovers the same key and decrypts
  old ciphertext; wrong password, flipped IV/ciphertext byte, short or
  empty blob all reject with no key stored; salt independence; constants
  pinned; RPC payload has exactly five fields and no password/key bytes;
  SQL guard order reviewed; one-time prompt gating.
- Tests derive with low iterations for speed; production uses 600k.
- Owner checks on the live DB, still pending: bytea round-trip (set,
  then restore on a fresh browser decrypts an old note); persisted
  `wrap_iterations=600000`, `wrap_algo='PBKDF2-SHA256'`; non-member RPC
  call denied.

## Later changes

- Prompt redesigned as "Keep your notes safe": two icon facts; the full
  §12b warning folded into a "How recovery works" disclosure (design
  session 2026-10-01). It appears after the full-screen "paired" moment.
- Change and restore live in the Settings page (PRD-45, then PRD-51
  `#settings`); restore is also offered from the dashboard when notes
  are locked.
