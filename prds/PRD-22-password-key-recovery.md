# PRD-22 — Password-wrapped key recovery

## Goal

Let a user set a recovery password that wraps the per-relationship key
into a blob stored on Supabase, and unwrap it on a new device — so
comments survive device loss without the server ever seeing the key
(§12b).

## Scope

**In:**
- `src/lib/crypto/recovery.ts`:
  - `deriveWrappingKey(password, salt, iterations)` — PBKDF2-SHA256,
    600k iterations (§12b), per-relationship random salt.
  - `wrapKey(relKey, wrappingKey)` → `wrapped_key_blob`.
  - `unwrapKey(blob, wrappingKey)` → `CryptoKey`.
- RPC `set_recovery_password(rel_id, wrapped_blob, salt, iterations,
  algo)` migration (§13d) — writes the wrap columns on `relationships`
  (member-only, via RLS/`is_relationship_member`). Covers first-set and
  change (re-wrap).
- Data-layer wrapper + store hook to fetch the wrapped blob for a
  relationship.
- Flows:
  - "Set recovery password" prompt right after pair success (PRD-21).
  - "Change recovery password" in settings (re-wrap with new password).
  - New-device restore: fetch blob → enter password → unwrap → store key
    in IndexedDB (PRD-18).

**Out:**
- The warning copy UI (PRD-23) — this PRD does the mechanism; PRD-23 does
  the honest messaging.
- Google account linking (Phase 8) — recovery is password-based and
  independent of login (§12b).

## Touched files / new files

- `src/lib/crypto/recovery.ts` — new.
- `supabase/migrations/NNNN_set_recovery_password.sql` — new RPC.
- `src/lib/data/relationship.ts` — extend: fetch wrapped blob,
  `setRecoveryPassword(...)`.
- `src/components/RecoveryPassword.tsx` (+ set/change/restore views) —
  new.

## Data model impact

- New RPC `set_recovery_password(rel_id, wrapped_blob, salt, iterations,
  algo)`. Writes existing `relationships` wrap columns (from PRD-15). No
  new tables.

## UI behavior

After pairing: prompt to set a recovery password (skippable, with an
honest warning per PRD-23). Settings: change password. New device:
enter password to restore the key.

## Verification

1. Set password → `relationships` row has `wrapped_key_blob`,
   `wrap_salt`, `wrap_iterations=600000`, `wrap_algo='PBKDF2-SHA256'`.
2. On a fresh browser with no IndexedDB key: fetch blob + enter correct
   password → key restored → previously-encrypted comment decrypts.
3. Wrong password → unwrap fails cleanly ("couldn't unlock"), no key
   stored.
4. Change password re-wraps; old password no longer unwraps, new one
   does.
5. Server never receives the plaintext key or password (only blob +
   salt + params).

**Unit tests (Dev):**
- `tests/unit/crypto-recovery.test.ts`: derive→wrap→unwrap round-trip;
  wrong password fails; salt/iteration params respected; 600k iterations
  configured.
- Data-layer wrapper calls `set_recovery_password` with correct args.

**QA suite:**
- Adversarial: tampered blob → unwrap fails; truncated salt; iteration
  downgrade attempt has no effect (client fixes 600k); RPC called by a
  non-member → denied; verify no key/password in any network payload.

## Open questions

- Skippable at pair time? Owner intent (§12b) is "prompt right after
  pair," honest that skipping risks loss. Dev implements skippable with
  the PRD-23 warning and records.
