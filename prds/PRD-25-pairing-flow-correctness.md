# PRD-25 — Pairing flow correctness (confirm step, pending invites, peek)

## Goal

Fix the pairing flow traps found in owner device testing:
- Opening the deep-link / scanning **immediately redeemed** the invite on
  whatever browser opened it, stranding the user who wanted another
  browser and yanking the QR from the inviter.
- The inviter **lost the QR** on reload/consume with no way to re-show it.
- The standalone short 8-char code shown under the QR is confusing and
  cannot pair on its own (the key lives only in the invite link).

## Scope

**In:**
- **Join confirm step (D-25.1):** opening `/app#pair=<payload>` (or a
  camera/manual decode) does NOT auto-redeem. It shows a confirm view:
  "Join <inviter name>?" with a Join button and a Cancel/Back. Redemption
  (`redeemPairCode` + key import + store) happens only on the Join tap.
  The parsed payload (code + keyBase64) is held in memory until confirm.
- **peek_pair_code RPC (D-25.2):** new read-only migration RPC
  `peek_pair_code(p_code text)` returning the inviter `display_name` and
  `archetype` for a code that is valid, unconsumed, and unexpired; raises
  a clean error otherwise (invalid/expired/consumed). It must NEVER return
  the key (key is not on the server anyway) and must not consume the
  invite. `security definer set search_path=''`, `auth.uid()` guard.
  Data-layer wrapper `peekPairCode(code)` + friendly error mapping.
- **Persist + re-show pending invite (D-25.3):** the inviter's pending
  invite (code + keyBase64) already persists in localStorage
  (`pair_invite_pending`) + IndexedDB. Make the invite view reliably
  RESTORE and RE-SHOW the QR + link + cancel whenever a pending invite
  exists (on mount and when returning to the pair flow), instead of
  dropping to the "create invite" state. Keep the 3s poll -> on consume,
  migrate key + refresh into the paired state.
- **Drop/relabel the short code:** remove the standalone short code from
  the invite UI (or demote to a clearly non-actionable "reference only"
  line). The primary shareables are the QR and the copyable invite link.
- **Deep-link robustness:** when `/app` opens with `#pair=`, route into
  the Join CONFIRM view (not auto-redeem) and clear the fragment after
  capturing the payload, so moving the link to another browser / reload
  does not double-fire and the invite is not burned until the user
  confirms. If the code is already consumed/expired at peek time, show a
  friendly message (invite no longer valid) rather than a dead end.

**Out:**
- Visual polish + nav + dropdowns (PRD-26).
- Multi-relationship / invites list across many relationships (later).
- Changing the wire payload or the deep-link URL format (PRD-24 stays).

## Touched files / new files

- `supabase/migrations/0005_peek_pair_code.sql` — new RPC.
- `src/lib/data/relationship.ts` — add `peekPairCode(code)` +
  `PairInvitePeek` type; friendly error mapping.
- `src/lib/data/types.ts` — `PairInvitePeek` type.
- `src/components/PairFlow.tsx` — Join confirm view; hold parsed payload;
  redeem only on confirm; robust pending-invite restore/re-show; deep-link
  routes to confirm + clears fragment.
- `src/components/QRScanner.tsx` — decode hands payload up to the confirm
  step (no direct redeem) — likely no change if it already just calls
  `onDecode`.

## Data model impact

- New read-only RPC `peek_pair_code`. No schema/table changes; no RLS
  change (RPC is `security definer`).

## UI behavior

Scanning/opening a link -> "Join <name>?" confirm -> Join redeems. The
inviter keeps seeing their QR + link (with Cancel) until it's consumed or
cancelled, across reloads. No confusing standalone short code.

## Verification

1. Opening `/app#pair=<valid>` shows a confirm view with the inviter's
   display name; the invite is NOT consumed until Join is tapped
   (peek does not consume — verify `consumed_at` still null after peek).
2. Tapping Join redeems, imports+stores the key, and both devices reach
   the same active relationship.
3. Moving the same link to a second browser BEFORE confirming still lets
   that browser peek + join (invite not yet burned). After a successful
   join elsewhere, the other browser's confirm->join shows a friendly
   "invite no longer valid".
4. Inviter reload while waiting: QR + link + Cancel reappear (pending
   invite restored), poll resumes, and on partner join the inviter
   transitions to paired.
5. No standalone actionable short code is shown; QR + copyable link only.
6. `peek_pair_code` never returns the key; invalid/expired/consumed codes
   yield friendly errors, no crash.

**Unit tests (Dev):**
- `peekPairCode` data wrapper calls `peek_pair_code` with `{ p_code }`,
  maps errors; returns `{ display_name, archetype }`.
- PairFlow: deep-link `#pair=` -> confirm view (no redeem call) + fragment
  cleared; Join tap -> redeem called once with the parsed code; pending
  invite restore re-shows QR/link on mount.
- Confirm view renders the peeked name; peek failure shows friendly msg.

**QA suite:**
- Adversarial: peek then abandon (invite stays unconsumed); confirm after
  the invite was consumed elsewhere -> friendly error, no key stored, no
  crash; deep-link with junk fragment -> no peek/redeem, no crash; double
  Join tap redeems once (no duplicate relationship); key never in peek
  RPC args/return; SQL review of `peek_pair_code` (no consume, no key,
  guards, expiry/consumed checks).

## Open questions

(none — decisions locked in `no-human-decisions.md` D-25.1/2/3.)
