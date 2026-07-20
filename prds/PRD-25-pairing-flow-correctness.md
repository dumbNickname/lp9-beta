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

## Dev notes

Implemented the confirm step, peek RPC, robust pending-invite restore, and
short-code removal. Diffs kept surgical.

### Files changed
- `supabase/migrations/0005_peek_pair_code.sql` (new) — read-only peek RPC.
- `src/lib/data/types.ts` — added `PairInvitePeek`.
- `src/lib/data/relationship.ts` — added `peekPairCode` + `friendlyPeekError`.
- `src/components/PairFlow.tsx` — confirm sub-state/view; deep-link -> confirm
  + clear; Join-only redeem; robust pending-invite restore.
- `src/components/InviteQR.tsx` — removed the standalone short-code line.
- `tests/unit/peek-pair-code-data.test.ts` (new).
- `tests/unit/pair-flow.test.tsx` — reworked to the confirm flow.
- `tests/unit/invite-qr.test.tsx` — asserts the short code is now absent.

### peek RPC shape + why
`peek_pair_code(p_code text) returns table(display_name text, archetype text)`
`language plpgsql security definer set search_path=''`. Guards mirror
`redeem_pair_code`: `auth.uid()` null -> `not authenticated`; not found ->
`invalid code`; `consumed_at is not null` -> `code already used`;
`expires_at < now()` -> `code expired`. Then `return query select
p.display_name, v_invite.archetype from public.profiles p where p.id =
v_invite.created_by`. NO UPDATE (does not consume), NO key material (none
exists server-side; the AES key rides only in the invite-link fragment).
Chose `returns table(...)` because Supabase JS surfaces it as an array, so
the data wrapper takes `data[0]` — cleanest PostgREST-friendly shape and
matches the PRD guidance. `security definer` bypasses the creator-only invite
SELECT RLS and the co-member profile policy, which is exactly why the RPC is
needed (D-25.2). NOTE: not verified against a live DB (no local stack in env);
SQL applies on push to preview — QA must confirm on the preview branch that
peek returns the name and does NOT flip `consumed_at`.

### Confirm-flow state model (D-25.1)
Added a `confirm` view and a single `ConfirmState` signal holding
`{ code, keyBase64, peek, peekLoading, peekError, busy, redeemError }`. Flow:
`normalizeScannedInput -> parseInvitePayload`. If null -> `join` view with
"not a valid invite". Else set the confirm state (parsed payload held in
memory only), switch to `confirm`, and fire `peekPairCode(code)`. The confirm
view renders a spinner while `peekLoading`; on `peekError` it shows the
friendly message + a Back button and offers NO Join; on success it renders
"Join <peek.display_name or 'your partner'>?" with Join + Cancel.

Join-only-on-confirm is enforced structurally: redeem/import/putKey/refresh
live ONLY in `confirmJoin`, which is wired ONLY to the confirm view's Join
button. `handleDecode` (scan/paste/deep-link) never redeems — it only parses
+ peeks. `confirmJoin` early-returns if `busy` or `peekError` set, so the
Join button (also `disabled` while busy) redeems at most once; a redeem
failure stays on the confirm view with `redeemError` and no key stored.
`loadPeek` guards against stale updates by checking `confirm()?.code === code`
before applying peek results.

### Deep-link -> confirm + clear
`onMount`: `readPendingInvite()` first (inviter wins). Else `consumeDeepLink()`
which reads `parseInviteUrl(window.location.href)` and immediately strips the
fragment via `history.replaceState` (guarded for SSR / missing history), then
routes the captured payload through `handleDecode` -> confirm + peek (NOT
auto-redeem). Because the fragment is cleared up-front, reloading / moving the
link to another browser cannot re-fire or burn the invite before the user
confirms. `handleDecode` is now synchronous (peek is fired-and-forget via
`void loadPeek`), so no `void handleDecode` at call sites.

### Pending-invite restore robustness (D-25.3)
`onMount` unconditionally restores whenever `readPendingInvite()` returns a
value: sets `invite`, `view='invite'`, and `startPolling(code)` — then
`return`s so the deep-link branch cannot also fire (inviter-vs-joiner
exclusivity; inviter wins). The invite view already re-renders the QR + link
+ Cancel from the restored `invite()` signal, so a reload while waiting brings
the whole waiting screen back and resumes the 3s poll; on partner join
`onPaired` migrates the temp key and refreshes into the paired state.

### Short-code removal (D-25.3)
Removed the `<p class="invite-qr-code">Code {props.code}</p>` line from
`InviteQR.tsx`. `code` + `keyBase64` props are retained (they build the QR +
invite link). QR + copyable invite link remain the only shareables.

### QRScanner
No logic change needed — it already only calls `props.onDecode(raw)` and never
redeems. PairFlow routes that decode into the confirm flow.

### Tests / self-test results
`pnpm typecheck` PASS. `pnpm lint` PASS. `pnpm build` PASS (static; `.output/
server` empty, no server runtime). New/updated unit tests all green.

Full `pnpm test` summary: `Test Files 3 failed | 37 passed (40) / Tests 10
failed | 292 passed (302)`. All 10 failures are in `tests/qa/*` and are
LEGITIMATE PRD-25 contract changes — flagged below for QA (not edited, per
Dev contract).

### tests/qa breakage flagged for QA reconciliation
1. `tests/qa/pair-flow.adversarial.test.tsx` (PRD-21/24) — 7 failures. Its
   `vi.mock("~/lib/data/relationship", ...)` does not export `peekPairCode`,
   so the confirm view hits the vitest "no export" error on peek; and its
   friendly-error / key-never-on-server cases assume auto-redeem on scan.
   Under PRD-25, scan/paste routes to the confirm view and redeem only fires
   on Join. QA should add `peekPairCode` to the mock and drive redemption via
   the confirm view's Join button. The real invariants (key never on server;
   friendly errors; poll lifecycle; migration) still hold — only the trigger
   point moved.
2. `tests/qa/pair-flow-deeplink.adversarial.test.tsx` (PRD-24) — 2 failures.
   Asserts deep-link auto-redeems on mount. Under PRD-25 the deep-link routes
   to the confirm view (peek, no redeem); redeem fires on Join. Fragment is
   still cleared up-front (that assertion still holds). QA should update to
   confirm-then-Join and add `peekPairCode` to the mock.
3. `tests/qa/invite-qr.adversarial.test.tsx` (PRD-24) — 1 failure: "still
   shows the short code for reference". PRD-25 D-25.3 removes the standalone
   short code; the copy-full-URL invariant is unaffected. QA should drop/invert
   that single assertion.

### Owner device checks still needed (QA / preview)
- Opening `/app#pair=<valid>` shows the confirm with the inviter's name and
  does NOT consume the invite (`consumed_at` still null after peek).
- Moving the link to a second browser before confirming still peeks + joins;
  after a join elsewhere, the other browser's Join shows a friendly "invite
  no longer valid".
- Inviter reload while waiting re-shows QR + link + Cancel and resumes poll.
- `peek_pair_code` never returns key material and raises clean
  invalid/expired/consumed errors.

## QA findings

**Verdict: PASS → qa-done.** All four gates green:
`pnpm typecheck` PASS, `pnpm lint` PASS (`--max-warnings 0`),
`pnpm test` PASS (42 files / 315 tests), `pnpm build` PASS (static;
`.output/server` empty [0 files], `.output/public` present — no server
runtime). `gitleaks detect` clean (42 commits, no leaks).

### Verification table

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | Deep-link `#pair=<valid>` → confirm view w/ inviter name, NOT consumed until Join | PASS (component) | `pair-flow-deeplink.adversarial` proves mount → `peekPairCode("DEEPCODE1")`, no `redeemPairCode`, fragment cleared, "Join Partner Name?" heading. **Live `consumed_at` still-null = owner preview check (see below).** |
| 2 | Join redeems, imports+stores key, both devices reach same active relationship | PASS (component) | Join tap → `redeemPairCode` once → `putKey(relId,"imported-key")` → `refreshRelationship`. Cross-device convergence = owner check. |
| 3 | Move link to 2nd browser before confirm still peeks+joins; after join elsewhere → friendly "invite no longer valid" | PASS (component) | `pair-flow-confirm.adversarial` "Join when consumed elsewhere": redeem rejects `code already used` → friendly alert, stays on confirm w/ Back, no key stored, no crash. Real 2-browser timing = owner check. |
| 4 | Inviter reload → QR+link+Cancel reappear, poll resumes, partner-join transitions | PASS | `pair-flow-confirm.adversarial` restore test: mount w/ `pair_invite_pending` re-shows waiting + "Full invite link" + "Cancel invite", poll resumes (`getMyActiveRelationship` ticks), no peek/redeem on inviter path. |
| 5 | No standalone actionable short code; QR + copyable link only | PASS | `invite-qr.adversarial` flipped assertion: `queryByText(CODE)` null; QR canvas + invite-link field + copy button remain. Confirmed in `InviteQR.tsx` (short-code `<p>` removed). |
| 6 | `peek_pair_code` never returns key; invalid/expired/consumed → friendly errors, no crash | PASS (component + SQL review) | `peek-pair-code.adversarial` (real data layer): args `{ p_code }` only, `data[0]`, throws on empty, maps all three errors, drops any stray key field. SQL static review below. Live behavior = owner check. |

### Reconciliation of the 3 pre-existing QA suites (contract moved, not gutted)

1. **`tests/qa/pair-flow.adversarial.test.tsx`** (was 7 failing) — added
   `peekPairCode` to the relationship mock (+ default resolve in
   `beforeEach`). Re-pointed the redeem/friendly-error/malformed subjects
   to the new trigger: paste → Continue → **confirm view + peek** → **Join
   tap** → redeem. Kept every invariant: poll lifecycle (3s / stop-on-pair /
   stop-on-unmount), inviter key migration (`getKey`→`putKey`→`deleteKey`),
   key-never-on-server, malformed paste → no peek/redeem, reload-safety.
   Added a peek-arg no-key assertion.
2. **`tests/qa/pair-flow-deeplink.adversarial.test.tsx`** (was 2 failing) —
   added `peekPairCode` to the mock. Deep-link now asserts confirm+peek (no
   auto-redeem) + fragment cleared up-front, then Join → redeem once with the
   parsed code. Kept: junk fragment → no peek/redeem/no crash + cleared;
   `#foo=bar` → landing; normal mount untouched; inviter-pending wins
   (fragment left intact, no peek/redeem).
3. **`tests/qa/invite-qr.adversarial.test.tsx`** (was 1 failing) — inverted
   "still shows the short code" → "does NOT show a standalone actionable
   short code (D-25.3)" while asserting QR + copyable link + copy button
   remain. Copy-full-URL and clipboard-failure fallback cases untouched.

### New adversarial tests added

- **`tests/qa/peek-pair-code.adversarial.test.ts`** (real data layer, no
  relationship mock): peek sends only `{ p_code }` (single RPC, no key on
  wire); `data[0]`; null `display_name` tolerated; a stray `key` field on the
  RPC row is NOT surfaced (typed wrapper reads only display_name+archetype);
  invalid/expired/consumed + unknown + empty-result all map to friendly
  errors. Proves the peek boundary carries no key and never issues a mutating
  RPC (no-consume at the wrapper level).
- **`tests/qa/pair-flow-confirm.adversarial.test.tsx`** (component):
  - *Confirm-then-abandon:* paste → confirm/peek shown → Cancel → NO redeem,
    NO `importKeyRaw`, NO `putKey`; returns to Join view.
  - *Consumed-elsewhere race:* peek OK, Join tap → redeem rejects
    `code already used` → friendly alert, stays on confirm w/ Cancel, no key
    stored, no crash.
  - *Double Join tap → redeem ONCE:* redeem held pending; two rapid taps →
    exactly one `redeemPairCode` (busy guard), one `putKey` on resolve — no
    duplicate relationship / double-spend of the invite.
  - *Pending-invite restore + inviter-wins-over-deep-link* (as above).
  - Peek args asserted key-free on every call.

### SQL static review — `supabase/migrations/0005_peek_pair_code.sql`

All required properties present:
- `security definer` + `set search_path = ''`; every ref fully qualified
  (`public.pairing_invites`, `public.profiles`, `auth.uid()`, `now()`).
- `auth.uid()` null guard → `not authenticated`.
- `if not found` → `invalid code`; `consumed_at is not null` → `code already
  used`; `expires_at < now()` → `code expired`. Ordering mirrors
  `redeem_pair_code` (0003).
- **No UPDATE/INSERT/DELETE** — read-only, does not consume.
- Returns `table(display_name text, archetype text)` only; body selects
  `p.display_name, v_invite.archetype` — **no key column** (none exists
  server-side; AES key rides only in the invite-link fragment).
- Joins `public.profiles p on p.id = v_invite.created_by` — correct inviter.
- Columns verified against `0002_relationships_pairing.sql`
  (`pairing_invites`: `code` unique, `created_by`, `archetype`, `expires_at`,
  `consumed_at`). Creator-only invite SELECT RLS (0002 L66) is exactly what
  `security definer` is needed to bypass — matches D-25.2.
- **Smells (non-blocking):** unqualified `code` in `where code = p_code`
  resolves to the table column (unambiguous under the single `from`); same
  style as `redeem_pair_code`. No injection surface (parameterized). No
  defects.

### No defects found

No production-code changes were made by QA. All defects: none. The
implementation matches the locked decisions D-25.1/2/3.

### Owner / live-preview-branch checks still required (cannot run locally)

No local Postgres in this env, so the following are component/SQL-verified
here but MUST be confirmed on the Supabase preview branch by the owner:
- `peek_pair_code` on the live DB returns the inviter's `display_name` and
  **leaves `consumed_at` NULL** (the no-consume guarantee — proven read-only
  by SQL review, but confirm empirically).
- Bytea round-trips are unaffected (PRD-22 note) — not touched by PRD-25.
- Cross-device: opening `/app#pair=<valid>` on a 2nd browser before confirm
  still peeks+joins; after a join elsewhere the loser's Join shows the
  friendly "invite no longer valid".
- Inviter reload on the live app re-shows QR+link+Cancel and the 3s poll
  transitions to paired on partner join.
