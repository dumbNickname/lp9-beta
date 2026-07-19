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

## Scope expansion (approved)

The orchestrator approved adding `src/routes/app.tsx` to this PRD's scope
(D-22.0 / D-22.3). The post-pair "set recovery password" prompt was moved
OUT of PairFlow's blocking flow and INTO the app shell as a one-time,
skippable overlay:

- `PairFlow.onPaired` / redeem path now call `refreshRelationship()`
  immediately after migrating the temp key -> rel id, so the relationship
  goes active in the store right away and PairFlow unmounts naturally.
  Polling-stop / cleanup semantics unchanged.
- `src/routes/app.tsx` renders `<RecoveryPassword mode="set" .../>` as a
  one-time next-step above the dashboard placeholder when a relationship
  is active and recovery hasn't been prompted/skipped yet. "Prompted"
  state is tracked per relationship in localStorage
  (`recovery_prompted:<relId>`, defensive try/catch) so it shows once and
  is reload-safe. It does NOT block the dashboard (rendered alongside it).
- Supabase Vault was evaluated and rejected (server-held root key breaks
  E2E); the client-side PBKDF2+AES-GCM wrap stays.

**QA-barrier fix (authorized):** because `onPaired` again calls
`refreshRelationship()` directly at pair-detect (the pre-PRD-22 behavior),
the previously-red barrier in `tests/qa/pair-flow.adversarial.test.tsx:117`
(`expect(mockRefreshRelationship).toHaveBeenCalled()` after one poll tick)
is valid again as written. No rework was needed — I restored the correct
signal rather than weakening the assertion, and the "STOPS polling after
pair-success" subject (lines 119-122) still passes. The QA file was left
untouched. The Dev unit test `tests/unit/pair-flow.test.tsx` redeem case
was restored to assert the immediate `refreshRelationship()` call.

## Dev notes

**Files changed**
- `src/lib/crypto/recovery.ts` (new) — `deriveWrappingKey`, `wrapKey`,
  `unwrapKey`; constants `DEFAULT_ITERATIONS=600000`,
  `WRAP_ALGO='PBKDF2-SHA256'`, `SALT_BYTES=16`. Reuses
  `exportKeyRaw`/`importKeyRaw` from `aes.ts`. No top-level `crypto`
  access — all inside functions, so SSR/prerender-safe.
- `supabase/migrations/0004_set_recovery_password.sql` (new) — RPC
  `set_recovery_password(p_rel_id, p_wrapped_blob, p_salt, p_iterations,
  p_algo) returns void`, `security definer set search_path=''`, guards
  `auth.uid()` + `public.is_relationship_member(p_rel_id)`, plain UPDATE
  of the four wrap columns (covers first-set and change).
- `src/lib/data/relationship.ts` — added `getRelationshipWrap`,
  `setRecoveryPassword`, and bytea helpers `bytesToBytea`/`byteaToBytes`.
- `src/lib/data/types.ts` — added `RelationshipWrap` interface.
- `src/components/RecoveryPassword.tsx` (new) — `mode` prop:
  `set`/`change`/`restore`.
- `src/components/PairFlow.tsx` — post-pair refreshes the gate immediately
  (prompt now lives in the shell, not here).
- `src/routes/app.tsx` (scope expansion) — one-time skippable
  `RecoveryPassword mode="set"` overlay above the dashboard placeholder,
  tracked per relationship in localStorage.
- Tests: `tests/unit/crypto-recovery.test.ts`,
  `tests/unit/relationship-wrap-data.test.ts`.

**Wrap layout (D-22.1):** `wrapped_key_blob = iv(12 bytes) || ciphertext`.
AES-256 raw key = 32 bytes; AES-GCM tag = 16 bytes -> ciphertext 48 bytes
-> blob is exactly 60 bytes (asserted in the crypto test).

**bytea encode/decode for PostgREST (CRITICAL for QA — no live DB here):**
Supabase/PostgREST serializes `bytea` as a hex string prefixed with `\x`
(Postgres default `bytea_output = hex`). I assume:
- **Output (SELECT):** `getRelationshipWrap` receives `wrapped_key_blob` /
  `wrap_salt` as `"\x...."` strings; `byteaToBytes` strips the `\x` and
  parses hex pairs. It also defensively handles a `Uint8Array` or numeric
  array in case driver/config differs.
- **Input (RPC):** `setRecoveryPassword` sends bytea args as the same
  `"\x...."` hex text; PostgREST casts hex text to `bytea`.
Confidence: **moderate-high** on the hex `\x` assumption (it is the
Postgres/PostgREST default), but **unverified against the live preview
DB.** QA MUST confirm on the Supabase preview branch that (a) the stored
blob round-trips (set -> restore on a fresh browser decrypts an existing
comment), and (b) `wrap_iterations=600000`, `wrap_algo='PBKDF2-SHA256'` in
the row. If PostgREST returns bytea in some other form, only the two
helpers in `relationship.ts` need adjusting.

**PBKDF2 test speed:** 600k iterations is slow, so the crypto round-trip
tests derive with `FAST_ITERS=1000` (passed explicitly to
`deriveWrappingKey`), while a separate assertion pins
`DEFAULT_ITERATIONS === 600000` / `WRAP_ALGO` / `SALT_BYTES`. The
component always uses the real 600k default.

**Change password = re-wrap without old password:** on the device doing a
change, the plaintext relationship key is already in IndexedDB
(`getKey`), so `change` mode derives a fresh wrapping key from the *new*
password (fresh salt) and re-wraps. No old password needed — matches
DESIGN §12b. `restore` mode is the only path that needs the password to
recover the key (nothing local to fall back on).

**Failure handling:** wrong password / tampered blob -> AES-GCM decrypt
throws inside `unwrapKey`; the `restore` view catches it and shows
"Couldn't unlock..." and stores no key.

**Self-test results:** all four commands green — `pnpm typecheck` clean,
`pnpm lint` clean, `pnpm test` **152 passed (23 files)** (including the
previously-red PRD-21 QA barrier, now valid again after moving the prompt
to the shell), `pnpm build` static output OK with `.output/server` empty
(no server runtime).

**Gotchas for QA:**
- Verify no plaintext key or password in any network payload (only
  blob + salt + iterations + algo cross the wire).
- Adversarial: tampered blob, truncated salt, iteration-downgrade attempts
  — client always fixes 600k on set; restore uses the stored iteration
  count, so a downgraded stored value would still just derive a different
  key and fail to unwrap (no plaintext leak).
- Non-member RPC call must be denied by the `is_relationship_member`
  guard (verify on preview DB).

## QA findings

**Verdict: `qa-done`.** All five Verification steps pass to the extent
possible in jsdom/Node WebCrypto; every adversarial case is green. The
only items not machine-verifiable here are explicitly-flagged live-DB
preview-branch owner checks (bytea round-trip on the wire, actual row
values, non-member RPC denial). All four gates green with QA tests
included: `pnpm typecheck` clean, `pnpm lint` clean, `pnpm test`
**189 passed (28 files)** (152 prior + 37 new QA), `pnpm build` static
output OK with `.output/server` empty (no server runtime),
`.output/public` present.

### Verification steps

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | Set password -> row has blob/salt/`wrap_iterations=600000`/`wrap_algo='PBKDF2-SHA256'` | PASS (client) / OWNER (DB row) | Component always wraps with `DEFAULT_ITERATIONS=600000` + `WRAP_ALGO='PBKDF2-SHA256'` and calls `set_recovery_password` with exactly those args (asserted, `recovery-component`/`recovery-data`). Actual persisted row values are a preview-branch owner check. |
| 2 | Fresh browser, correct password -> key restored, prior comment decrypts | PASS (jsdom) / OWNER (live bytea) | Crypto round-trip proves unwrap recovers the *same* key that encrypted a message (byte-for-byte raw match + decrypt), and the `restore`-mode component writes the key to a real (fake-)IndexedDB and fires `onDone`. Live-DB blob round-trip flagged below. |
| 3 | Wrong password -> clean "couldn't unlock", no key stored | PASS | Crypto layer rejects; `restore` view shows "Couldn't unlock..." and `getKey` stays `null` (`recovery-component`, `recovery-crypto`). |
| 4 | Change re-wraps; old password no longer unwraps, new does | PASS (mechanism) / OWNER (live) | `change` mode derives a fresh wrapping key from the new password with a *fresh salt* and overwrites blob+salt via the same RPC; by construction the old password/old salt no longer match the stored record. Verified the set/change wrap path + args; end-to-end old-vs-new on live DB is an owner check. |
| 5 | Server never receives plaintext key or password | PASS | RPC payload has exactly `{p_rel_id, p_wrapped_blob, p_salt, p_iterations, p_algo}`; a deep-serialized regex over all mock RPC call args finds neither the high-entropy password sentinel nor raw key bytes. `getRelationshipWrap` SELECTs only the four wrap columns (no `member_*`, no `*`). |

### Adversarial tests added (all under `tests/qa/`)

- **`recovery-crypto.adversarial.test.ts`** (Node WebCrypto + fake-indexeddb):
  - Pins production constants: `DEFAULT_ITERATIONS===600000`, `WRAP_ALGO==='PBKDF2-SHA256'`, `SALT_BYTES===16` (tests derive with `FAST_ITERS=1000` for speed).
  - Round-trip proves the *same* key (raw-byte match + decrypts the original ciphertext), not merely "a" key.
  - Wrong password -> reject + **no key stored** (keystore untouched).
  - Tampered blob: flip a **ciphertext** byte and flip an **IV** byte -> GCM auth fails -> reject + no key stored.
  - Malformed/truncated: empty blob, <12-byte blob, exactly-12-byte (IV-only) blob -> clean reject, no crash, no key stored.
  - Blob layout: exactly 60 bytes; manual split at 12 yields a 12-byte IV + a ciphertext that decrypts to the 32-byte raw key -> confirms `iv(12) || ciphertext` and that `unwrap` splits at 12.
  - Salt independence: same password + different salt -> different wrapping key -> cannot cross-unwrap.
  - **Iteration count is not a trust boundary** (documented precisely): correct pw + same iters unwraps; correct pw + *downgraded* iters simply derives a different key and **fails to unwrap** (no leak); wrong pw does **not** succeed even at 1 iteration. Restore uses the *stored* iteration count purely as a derivation input; a downgrade never converts a wrong password into a success.
- **`recovery-data.adversarial.test.ts`** (mocked supabase):
  - Server-never-sees-key/password: exact 5-key payload; deep-serialized regex over all RPC args excludes the password sentinel + raw key bytes.
  - `getRelationshipWrap` SELECT column audit (only the 4 wrap columns).
  - bytea helper round-trip: `0x00`, `0xff`, `0x7f`, `0x80`, high bytes survive `set` (encode `\x` hex) -> `get` (decode) intact; decoder tolerates `\x`-hex string, `Uint8Array`, and numeric-array shapes.
  - `getRelationshipWrap` returns `null` (not throw) when wrap columns are all-null and when the row is absent.
- **`recovery-rpc-sql.adversarial.test.ts`** (static review of `0004`): `SECURITY DEFINER` + `set search_path=''`; `auth.uid()` null-check; `is_relationship_member(p_rel_id)` guard ordered *before* the UPDATE (fail-closed); UPDATE touches only the four wrap columns keyed by `id = p_rel_id`; no writes to `member_a/member_b/status`; exactly one UPDATE (covers first-set + change). Live member-guard enforcement is an owner preview-branch check.
- **`recovery-component.adversarial.test.tsx`** (real crypto + real fake-IDB keystore, mocked data layer): restore wrong-pw -> "Couldn't unlock" + no key; restore correct-pw -> key in IndexedDB + `onDone`; restore with no password set -> "No recovery password..." message, no crash, no key; set-mode mismatched confirm -> no RPC; set-mode with no local key -> "not available on this device" + no RPC; set-mode with a local key -> wraps to a 60-byte blob + 16-byte salt and calls `setRecoveryPassword` with `600000` / `PBKDF2-SHA256`.
- **`recovery-overlay.adversarial.test.tsx`** (D-22.3 shell gating, `RecoveryPassword` stubbed): overlay appears when a relationship first appears and renders *alongside* (does not block) the dashboard; skip and done both set `localStorage['recovery_prompted:<relId>']='1'` and hide the overlay; pre-seeded flag -> overlay absent on remount (reload-safe); a different relationship id still prompts (per-relationship flag).

### Secret hygiene

`gitleaks detect --no-git --source tests/qa` -> **no leaks**. `gitleaks
protect --staged` (the pre-commit hook path) -> **no leaks**. A whole-tree
scan reports one hit in **`.env`** only, which is gitignored, unstaged,
and never committed — not a defect. The password sentinel in
`recovery-data` is high-entropy per AGENTS.md so the "no leak on the
wire" assertion has real teeth without tripping gitleaks on the test
file itself.

### Defects

None. No Verification step failed and no adversarial test revealed a bug.

### Owner / preview-branch checks (NOT QA failures — no live DB here)

1. **bytea `\x`-hex round-trip on the live preview DB** (the CRITICAL item
   from Dev notes): confirm a real `set` -> `restore` on a fresh browser
   decrypts an existing comment, i.e. PostgREST serializes/accepts bytea as
   `\x`-prefixed hex as assumed. If it returns another shape, only the two
   helpers in `relationship.ts` need adjusting; the QA data suite already
   proves the `Uint8Array` and numeric-array fallbacks decode correctly.
2. **Persisted row values** `wrap_iterations=600000`, `wrap_algo='PBKDF2-SHA256'`.
3. **Non-member RPC call is denied** by the `is_relationship_member`
   guard (SQL statically reviewed here; live denial is the owner check).
