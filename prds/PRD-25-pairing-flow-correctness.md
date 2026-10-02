# PRD-25 — Pairing flow correctness (confirm step, pending invites, peek)

> Status: see `PROGRESS.md`. Later changes below.

## Goal

Fix pairing traps from owner device testing: opening the link or
scanning redeemed the invite immediately in whatever browser opened it
(stranding users who wanted another browser and yanking the inviter's
QR); the inviter lost the QR on reload; the standalone short code was
confusing and could not pair on its own.

## What shipped

- **Join confirm step:** link, scan or paste only parses the payload
  (held in memory) and peeks; the user sees "Join <inviter name>?" with
  Join and Cancel. Redeem + key import + store happen only on the Join
  tap. Join is guarded so a double tap redeems once; a redeem failure
  stays on confirm with a friendly message and stores no key.
- **`peek_pair_code(p_code text)` RPC** returns
  `table(display_name text, archetype text)` for a valid, unconsumed,
  unexpired code. `security definer`, `set search_path = ''`, fully
  qualified refs. Errors, in `redeem_pair_code` order: `not authenticated`
  / `invalid code` / `code already used` / `code expired`, mapped to
  friendly copy (e.g. invite no longer valid). Read-only: never consumes,
  never returns key material (none exists server-side). Needed because
  invite and profile RLS hide the inviter from the joiner. Client wrapper
  sends only `{ p_code }` and reads the first row.
- **Pending invite restore:** whenever a pending invite exists
  (`pair_invite_pending` in localStorage + key in IndexedDB) the inviter
  sees QR + link + Cancel again after reload, and the 3s poll resumes;
  on consume the temp key moves to the new pair.
- Deep link: fragment captured and stripped before confirm, so reload or
  moving the link to another browser cannot double-fire or burn the
  invite before the user confirms. Inviter (pending invite) wins over a
  deep link.
- Standalone short code removed; QR + copyable invite link are the only
  shareables.
- Out: visual polish/nav (PRD-26); multi-relationship invites; changing
  the payload or deep-link URL format (PRD-24 stays).

## Decisions

- **D-25.1** Confirm before redeem: an invite is burned only by an
  explicit Join tap, never by opening a link or scanning.
- **D-25.2** Read-only `peek_pair_code` definer RPC to show the inviter's
  name without consuming the invite or exposing a key.
- **D-25.3** Pending invite persists and is always re-shown to the
  inviter; the short code is dropped from the UI.

## Verification

- Unit + QA component tests: link/scan -> confirm + peek, no redeem;
  Cancel stores nothing; consumed-elsewhere -> friendly error, no key;
  double Join -> one redeem; peek args key-free; inviter restore
  re-shows the waiting screen and resumes polling.
- SQL static review of the migration: no write statements, no key
  column, guards and checks as above.
- Owner/live checks still pending: on the live DB, peek returns the name
  and leaves `consumed_at` null; a second browser can peek+join before
  confirm and gets "no longer valid" after a join elsewhere; inviter
  reload on the live app re-shows QR and transitions to paired.

## Later changes

- Design session 2026-10-01: `#pair=` is captured once at app start into
  memory (never storage) and stripped, surviving onboarding. A joiner
  arriving via link during onboarding sees "<inviter> is waiting for
  you" and a "Join <name>" button that pairs in one tap (no second
  confirm, D-UX.1). D-25.1 still applies to scan/paste and to
  already-onboarded users. An already-paired user opening a link enters
  the new-pair flow (D-UX.2).
- Inviter key handoff: the 3s poll alone failed in background tabs
  (frozen timers); now any relationship refresh also moves the temp
  invite key onto the new pair. Both sides then see a full-screen
  "paired" moment, followed by the one-time recovery prompt.
