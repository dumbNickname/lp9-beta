# PRD-21 — Pair flow UI (invite + redeem, end-to-end)

> Status: see `PROGRESS.md`. Later changes: see below.

## Goal

Wire the full pairing experience: inviter generates a key + invite + QR;
joiner scans or pastes it; both land in the same relationship with the
key stored locally and never on the server.

## What shipped

- App gate: session -> profile (onboarding if no name) -> relationship
  (pair flow if none) -> dashboard.
- No relationship -> choose Invite or Join.
- Inviter: generates the AES-GCM key, calls `create_pair_invite` with the
  archetype hint (`localStorage["archetype_hint"]`, falls back to
  `getting_to_know`), shows the QR, waits. Cancel calls
  `revoke_pair_invite` and deletes the temp key.
- Joiner: parse payload -> `redeem_pair_code(code)` -> relationship id
  -> import the key and store it under that id.
- Key handoff: inviter's key sits in the IndexedDB keystore under
  `invite:<code>` until the pair exists, then moves to the relationship
  id and the temp entry is deleted.
- Reload-safety: `localStorage["pair_invite_pending"]` holds
  `{code, keyBase64}` so the waiting screen resumes after reload; the
  CryptoKey itself stays in IndexedDB. Storage failure only degrades
  reload-resume.
- Only archetype or code cross to the server; the key never does.
- Relationships are read with an explicit member filter (PostgREST).
- The five RPC errors (invalid, already used, expired, self-pair,
  relationship exists) map to friendly messages; unknown errors get a
  generic one; no key is stored on error.
- Out: recovery prompt/warnings (PRD-22/23), starter coupons,
  multi-relationship UI (PRD-43).

## Decisions

- **D-21.1** Inviter key stored under temp id `invite:<code>` in the
  existing keystore, migrated on pair. Survives reload; one storage
  layer. Owner: "indexeddb or local storage is fine." Risk: abandoned
  invites leave stale temp keys and pending markers until cancel/next
  invite; a sweep could come later.
- **D-21.2** Inviter waiting detection: poll ~3s while the invite screen
  is open, stop on pair or unmount, plus focus refresh. Live flip without
  Realtime; focus-only felt stuck. Realtime stays an option.

## Verification

- Unit + QA adversarial: RPC names/args, no key in any RPC arg, keystore
  isolation between relationships, imported key decrypts inviter
  ciphertext, temp-key migration, poll stops on pair and unmount,
  pending-marker resume and cancel cleanup, all gate states.
- Two-browser convergence and real-device QR scan were owner checks
  (jsdom cannot run the camera).

## Gotchas

- A persistent error mid-poll leaves the inviter waiting (accepted for
  beta); transient errors recover on the next tick.

## Later changes

- On pair the flow refreshes the relationship at once and the recovery
  prompt lives in the app shell (PRD-22, D-22.3).
- QR encodes a `#pair=` deep link; iOS scan fallback (PRD-24). Join has
  a confirm step with `peek_pair_code`; pending invite re-shown; short
  code dropped (PRD-25, D-25.1..3).
- Deep link is captured once at app start into memory (never storage)
  and stripped, so it survives onboarding; PairFlow no longer consumes
  it on mount (design session 2026-10-01).
- Joiner via link: onboarding shows "<inviter> is waiting for you" and a
  "Join <name>" button that pairs in one tap (D-UX.1); confirm still
  applies to scan/paste and onboarded users. Already-paired user opening
  a link -> new-pair flow (D-UX.2).
- The 3s poll failed in background tabs (frozen timers); any
  relationship refresh now also moves the temp key. Both sides see a
  full-screen "paired" moment, then the one-time recovery prompt.
- Loading gates cover first load only; the dashboard remounts only when
  the pair id changes.
- Onboarding archetype select became chips ("New together" /
  "Long-term" / "Close friends"), hidden when joining via link.
- Visual polish (PRD-47) superseded by the 2026-10-01 redesign: two big
  Invite/Join tiles, avatars, Web Share "Send link".
