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
