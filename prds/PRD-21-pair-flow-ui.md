# PRD-21 — Pair flow UI (invite + redeem, end-to-end)

## Goal

Wire the full pairing experience: inviter generates a key + invite +
QR; redeemer scans/enters it; both land in the same relationship with
the key stored locally.

## Scope

**In:**
- Inviter path:
  - Generate AES-GCM key (PRD-17); call `create_pair_invite(archetype)`
    with the archetype hint from onboarding localStorage (PRD-14);
    store the key in IndexedDB keyed by... (see Open questions — the
    relationship id doesn't exist until redemption); show QR (PRD-19)
    with `code + base64(key)` and the manual code.
  - Poll / refresh to detect when the invite is consumed → transition
    inviter into the paired state, persist key under the new
    relationship id.
- Redeemer path:
  - Scan/enter (PRD-20) → `parseInvitePayload` → `redeem_pair_code(code)`
    → receive relationship id → store the key (PRD-18) under that id.
- Post-pair: `/app` reflects an active relationship (dashboard
  placeholder for now); archetype hint applied to the relationship
  (already set by the RPC from the invite).
- Uses theme tokens; logical CSS only.

**Out:**
- Recovery-password prompt + warning UI (PRD-22, PRD-23) — pairing works
  without them; they layer on after.
- Archetype starter coupons (Phase 4).
- Relationship switcher / multi-relationship UI (later).

## Touched files / new files

- `src/routes/app.tsx` — route into pair flow when no active
  relationship.
- `src/components/PairFlow.tsx` (+ subviews) — new.
- `src/lib/data/relationship.ts` — new: `getMyRelationships()`,
  `createPairInvite()`, `redeemPairCode()` wrappers over RPCs (data
  layer, §9c).
- `src/lib/stores/relationship.ts` — new: reactive current-relationship
  + `refresh()`.

## Data model impact

None new (consumes PRD-15/16). Data-layer wrappers only.

## UI behavior

No relationship → choose "Invite" or "Join". Invite shows QR + code and
waits. Join scans/enters, then both see a paired dashboard.

## Verification

1. Two browsers (or two profiles): A invites, B scans/enters → both see
   the same active relationship.
2. A's IndexedDB and B's IndexedDB both hold the relationship key; it is
   **never** present in Supabase (check `relationships` row — only
   wrapped blob columns, still null here).
3. Reload after pairing → relationship persists; key still in IndexedDB.
4. Redeeming an expired/consumed code shows a friendly error.

**Unit tests (Dev):**
- Data-layer wrappers call the right RPCs (mock client).
- Store `refresh()` updates the current-relationship signal.
- Component gate: no-relationship → PairFlow; active → dashboard.

**QA suite:**
- Adversarial: B redeems, then A's poll must converge to paired (no
  stuck state); double-redeem race (PRD-16) surfaces one relationship;
  key-store isolation between two relationships.

## Open questions

- **Inviter key-before-relationship-id problem:** the key is generated
  before a relationship id exists. Options: store under a temp key
  (invite code) then migrate to relationship id on consume; or derive
  id-independent storage. Dev picks and records; must not lose the key
  if the inviter reloads while waiting.
- Inviter "waiting" detection: poll interval vs focus-refresh only
  (§9a). Dev records.

## Dev notes

Implemented per D-21.1 / D-21.2. Files:

- `src/lib/data/types.ts` — added `Archetype`, `RelationshipStatus`,
  `Relationship` (matches §13a columns actually present; recovery-blob
  columns omitted as they are null pre-PRD-22 and unused here).
- `src/lib/data/relationship.ts` — `getMyRelationships`,
  `getMyActiveRelationship`, `createPairInvite`, `redeemPairCode`,
  `revokePairInvite`. Throw-on-error like `profile.ts`; friendly-message
  mapping stays in the UI.
- `src/lib/stores/relationship.ts` — signals + `refreshRelationship()`
  (2s throttle, mirrors profile store) + `useRelationshipFocusRefresh()`.
- `src/components/PairFlow.tsx` — landing / invite / join subviews.
- `src/routes/app.tsx` — gate extended: session -> profile (onboarding
  if no display_name) -> relationship (PairFlow if none) -> dashboard
  placeholder.
- `src/styles/global.css` — minimal `.pair-flow-*` layout (logical
  props, theme tokens).

**Key migration (D-21.1):** inviter generates AES key, `exportKeyRaw` ->
`bytesToBase64` into the QR payload, stores the CryptoKey in the existing
IndexedDB keystore under temp id `invite:<code>`. Poll detects the new
relationship; `onPaired()` reads the temp key back, `putKey(relId, key)`,
`deleteKey("invite:<code>")`, clears the pending marker, refreshes the
store. Redeemer path: `redeemPairCode` -> `importKeyRaw(base64ToBytes)`
-> `putKey(relId, key)` -> refresh.

**Poll (D-21.2):** `setInterval` every 3000ms while the invite/waiting
screen is mounted; calls `getMyActiveRelationship()` directly (bypasses
the store's 2s throttle to stay deterministic). Stops on pair-success
(`onPaired`) and on `onCleanup`. Focus-refresh also wired via the store
helper in `app.tsx`.

**Archetype-hint source:** `localStorage["archetype_hint"]` — the key
Onboarding.tsx writes (line 39). Validated against the three archetype
values; falls back to `"getting_to_know"` if absent/invalid/storage
unavailable, so the user can always proceed.

**Reload-safety:** on `createPairInvite` success we persist
`{code, keyBase64}` to `localStorage["pair_invite_pending"]` (the AES
KEY itself stays in IndexedDB, never localStorage). On mount, if a
pending marker exists, PairFlow restores the invite/waiting screen and
resumes polling. Cleared on pair-success and on cancel. All
localStorage access is try/catch-guarded; if storage is unavailable
pairing still works, only reload-resume degrades.

**PostgREST gotcha:** `getMyRelationships` uses an explicit
`.or("member_a.eq.<uid>,member_b.eq.<uid>")` filter rather than a bare
filterless select, per the AGENTS.md rule that RLS-only selects can 400.
Selects explicit columns. Not empirically observed 400ing (no live DB in
this env) — added defensively.

**RPC returns:** `create_pair_invite` returns the code (text),
`redeem_pair_code` returns the relationship id (uuid), `revoke_pair_invite`
returns void — wrappers surface `data`/`error` from `supabase.rpc`.
Friendly error mapping covers the five RPC exception messages
('invalid code','code already used','code expired','cannot pair with
yourself','relationship already exists').

**Self-test:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
all green. 104 unit tests pass (17 files), incl. new
`relationship-data`, `relationship-store`, `pair-flow` (join redeem +
`putKey(relId, importedKey)`, expired-code friendly error, invite
temp-key storage), `app-gate` (no rel -> PairFlow, active -> dashboard).
Static build clean; `.output/server` present but empty (no server
runtime), per repo contract.

**For QA:**
- The full camera decode path is not reproducible in jsdom (BarcodeDetector
  absent); `pair-flow` tests exercise the manual-paste path. Real-device
  QR scan + two-browser convergence are QA/owner checks (PRD Verification
  1-3).
- Poll convergence: after B redeems, A's 3s poll should flip to the
  dashboard within ~3s. Watch for a stuck state if `getMyActiveRelationship`
  errors mid-poll (currently the interval keeps running on next tick;
  transient errors self-recover, but a persistent error would leave A on
  the waiting screen — acceptable per beta scope).
- Abandoned invites leave stale `invite:<code>` entries in IndexedDB and a
  stale `pair_invite_pending` in localStorage until cancel/next invite
  (noted in D-21.1 cleanup risk).
- Key-store isolation between two relationships and the never-on-server
  key assertion (relationships row wrapped-blob columns null) are QA
  adversarial checks.

## QA findings

Verified independently on branch `feat/PRD-21-pair-flow-ui`. All four
pipeline commands pass with QA tests included:
`pnpm typecheck && pnpm lint && pnpm test && pnpm build` — 141 tests pass
(21 files: 104 Dev + 37 QA). `.output/server` empty (no server runtime;
static preset intact).

### Verification table

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | A invites, B scans/enters → same active relationship | PASS (proxied) | Two-browser/real-device path not reproducible in jsdom (no BarcodeDetector/getUserMedia). Redeem via the manual-paste path is exercised end-to-end; poll convergence for the inviter is proven with fake timers (see poll suite). Real-device convergence is an owner spot-check. |
| 2 | Key in both IndexedDBs, **never** in Supabase | PASS | Redeem stores the imported key under the returned rel id (real fake-indexeddb round-trip decrypts inviter ciphertext). Data layer selects only the 7 existing columns (no key/recovery/blob col); every RPC arg carries only `p_archetype`/`p_code`. Component-level: `createPairInvite` receives only the archetype; `redeemPairCode` receives only the code. |
| 3 | Reload after pairing → persists; key still local | PASS (proxied) | Store returns the active relationship after `refreshRelationship`; keystore persists across fresh IDB connections (PRD-18). Reload-resume of an *outstanding* invite proven via `pair_invite_pending` marker resuming the waiting screen + polling. |
| 4 | Expired/consumed code → friendly error | PASS | All five RPC exception strings map to distinct user-facing messages; unknown errors fall back to a generic message; key is never stored on the error path. |

### Adversarial tests (under `tests/qa/`)

- `relationship-data.adversarial.test.ts` — wrappers call correct RPC
  names + exact arg shapes; `getMyRelationships` selects only existing
  columns and applies the `member_a.eq/member_b.eq` filter; returns `[]`
  without querying when unauthed; every wrapper throws on supabase error;
  **no RPC arg ever carries a key** (regex-asserted over all calls).
- `keystore-isolation.adversarial.test.ts` (real fake-indexeddb) —
  **key isolation:** two relationships hold distinct keys, cross-decrypt
  fails, storing/deleting one never affects the other; **redeem path:**
  imported key stored under the RELATIONSHIP id (not the code /
  `invite:<code>`) and decrypts the inviter's ciphertext (proves the same
  AES key crossed the QR); **inviter migration (D-21.1):** temp key under
  `invite:<code>` migrates to rel id and temp entry is deleted.
- `pair-flow.adversarial.test.tsx` — **poll lifecycle (D-21.2):** interval
  polls on the 3s tick while waiting, **STOPS on pair-success** (no polls
  after the relationship appears) and **STOPS on unmount** (no leaked
  interval — anti-vacuous verified: inverting the assertion turns the test
  red); inviter pair-detect migration drives
  `getKey(invite:<code>) → putKey(relId) → deleteKey(invite:<code>)`;
  **key-never-on-server** on both invite and redeem flows (only
  archetype / code cross the boundary; key stored locally under rel id);
  friendly-error mapping for all five RPC strings + generic fallback, key
  not stored on error; malformed/non-invite payloads
  (`https://…`, `v2:…`, empty, `v1:CODE`) never reach the redeem RPC;
  reload-safety marker resumes waiting + polling and is cleared on cancel
  (also revokes server invite + deletes temp key).
- `app-gate.adversarial.test.tsx` — all four gate states: no session →
  Loading; profile without display_name → Onboarding (not PairFlow/dash);
  name + no relationship → PairFlow; active relationship → dashboard;
  relationship-loading → Loading (no premature PairFlow flash).

### Defects

None. No Verification step failed; no adversarial test revealed a bug.

### Notes / accepted risks (from Dev notes, confirmed, not blocking)

- Persistent (non-transient) errors mid-poll leave the inviter on the
  waiting screen; documented as acceptable beta scope. Transient errors
  self-recover on the next tick.
- Abandoned invites leave stale `invite:<code>` (IndexedDB) and
  `pair_invite_pending` (localStorage) until cancel/next invite (D-21.1
  cleanup risk). Cancel path cleans both, confirmed by test.
- Two-browser + real-device QR camera convergence remain owner
  spot-checks (jsdom cannot reproduce the camera decode path).
