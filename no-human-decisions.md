# no-human-decisions.md

> Decisions the orchestrator/agents made **autonomously** while keeping
> momentum, where a human could reasonably prefer a different option.
> Review at leisure; question or override any of these and we'll do a
> follow-up PRD. Newest at top.
>
> This file is a review queue, not a source of truth. Once a decision is
> ratified or changed, move the rationale into `DESIGN.md`/the PRD and
> trim the entry here.

## PRD-25 — Pairing flow correctness

### D-25.1 Join requires an explicit confirm step (no auto-redeem)
- **Decision:** opening the deep-link / scanning no longer immediately
  redeems. It shows a "Join <inviter name>?" confirm screen; redemption
  happens only on the Join tap. Lets the user move the link between
  browsers before burning the invite.
- **Why:** auto-redeem on open silently consumed the invite on whatever
  browser opened it (e.g. iOS Safari), stranding the user who wanted to
  use another browser and yanking the QR from the inviter.
- **Owner input given:** chose confirm step over instant redeem.

### D-25.2 peek_pair_code RPC for the confirm preview
- **Decision:** add a read-only `peek_pair_code(p_code)` RPC returning the
  inviter's `display_name` + `archetype` (NEVER the key) for a valid,
  unconsumed, unexpired code. Used only to render "Join <name>?".
- **Why:** RLS lets only the invite creator SELECT the invite, and the
  co-member profile policy needs an existing relationship — so the
  redeemer can't read the inviter name pre-pairing without an RPC.
- **Alternative:** generic "Join this relationship?" with no name (no
  migration) — rejected for weaker trust/clarity.

### D-25.3 Persist + re-show the inviter's pending invite; drop short code
- **Decision:** the inviter's pending invite stays visible/re-openable
  (QR + link + cancel) until consumed or cancelled, surviving reload.
  Remove the standalone short 8-char code from the invite UI (it can't
  pair on its own — the key lives in the link), or demote it to a
  non-actionable reference at most.
- **Why:** the short code confused the owner ("what is this code?") and
  is useless for joining; losing the QR on reload/consume was jarring.

## PRD-26 — App shell polish + navigation

### D-26.1 Header nav + <select> dropdowns + light styling pass
- **Decision:** add header navigation links (home / app / privacy /
  terms); convert the archetype and locale pickers to native `<select>`
  dropdowns (current layout breaks on mobile); apply a first-pass visual
  polish using existing theme tokens (no brand overhaul — name/brand
  still pending §14i).
- **Owner input given:** nav + selectors + light polish now; full
  redesign deferred.

### D-26.2 "Reset account" escape hatch (dev/testing)
- **Decision:** add a small "Reset account" action in the app shell that
  clears local device state (IndexedDB keys, pairing/recovery localStorage
  markers) and signs out -> a fresh anonymous user on reload. Lets the
  owner re-test pairing on a real device (no incognito on mobile) without
  being stuck on a stale already-paired anon account (which skips PairFlow
  and lands on the recovery-password overlay).
- **Why:** owner hit "B jumped to recovery password" because that browser's
  anon user was already paired from a prior test. Reset unblocks testing.
- **Owner input given:** "2" (nav + a reset/re-test escape hatch), plus
  "write down idea for unpair feature in future".
- **Scope note:** this only resets the LOCAL device/account (client-side +
  sign-out). It does NOT dissolve the server-side relationship for the
  partner. That is the future "unpair" feature below.
- **Alternatives:** full server-side unpair (dissolve relationship for both
  members) — deferred; see Future ideas.

### Future idea — Unpair / dissolve relationship
- Real product feature (not just local reset): a member ends a
  relationship, which dissolves it server-side for both parties (RLS +
  RPC + confirmation UI + key cleanup). Likely needed once multiple
  relationships per user are allowed. Own PRD later; not in PRD-26.

## PRD-24 — Pairing UX fixes

### D-24.1 QR encodes a deep-link URL with key in the fragment
- **Decision:** the pairing QR encodes an app URL
  `<origin><basePath>app#pair=<v1:code:keyB64>` instead of the raw
  payload. iOS native Camera then recognizes it as a URL, opens the app,
  and the app reads `#pair=` on load to auto-run/pre-fill Join. Plus a
  Copy button + selectable full-invite field on the invite screen, and an
  html5-qrcode in-app scanner fallback for browsers lacking
  `BarcodeDetector` (iOS).
- **Why:** raw-text QR (`v1:...`) is unusable by iOS native Camera ("No
  usable data found") and the manual code shown was the short code, not
  the full payload -> manual pairing was impossible.
- **Owner input given:** chose deep-link URL over raw-payload-only.
- **Tradeoff (accepted):** the AES key rides in the URL fragment. It is
  never sent to the server (fragments aren't transmitted), but it lands
  in the joiner device's browser history. Acceptable for beta; a paired
  device already holds the key. Revisit if history exposure matters.
- **Alternatives:** (a) keep raw payload + in-app scanner only (key never
  in a URL, but iOS native Camera still can't act on the QR — scan must
  happen inside the app); (b) put key in a query param (would be sent to
  the server — rejected).

## PRD-22 — Password-wrapped key recovery

### D-22.0 Not using Supabase Vault (kept client-side wrap)
- **Decision:** hand-rolled client-side PBKDF2+AES-GCM wrap, NOT Supabase
  Vault / pgsodium.
- **Why:** Vault encrypts with a Supabase-managed server-held root key,
  so the server could decrypt — breaks the E2E promise (DESIGN §12b:
  server must never see the key/password). No out-of-box Supabase feature
  does client-only key wrapping by definition. Our design is the correct
  safe architecture.

### D-22.3 Recovery prompt lives in the app shell, not gating PairFlow
- **Decision:** on pair-success, immediately `refreshRelationship()` so
  the relationship becomes active in the store right away; the "set
  recovery password" prompt then renders as a one-time, skippable overlay
  in the app shell/dashboard (after a relationship first appears), NOT as
  a blocking step inside PairFlow.
- **Why:** avoids a fragile "DB has relationship but store doesn't yet"
  gap; keeps polling-stop semantics clean; PairFlow unmounts as soon as
  the relationship is active (AppGate swap). Sounder UX: pairing
  completes instantly, recovery is an optional follow-up.
- **Scope expansion:** PRD-22 now also touches `src/routes/app.tsx`
  (hosts the overlay). Approved by owner. The merged PRD-21 QA timing
  barrier that assumed `refreshRelationship` fires on the poll tick is
  updated by QA (contract changed legitimately; test's real subject —
  polling stops — still holds; §16c: test the contract not incidentals).
- **Alternatives:** keep the prompt gating inside PairFlow (simpler diff,
  keeps the store/DB gap).

### D-22.1 Wrap method = AES-GCM encrypt of raw key bytes
- **Decision:** wrap the per-relationship AES key by exporting it raw
  and AES-GCM-encrypting those bytes with a PBKDF2-SHA256 (600k iters,
  per-relationship random salt) derived wrapping key. `wrapped_key_blob`
  = `iv (12 bytes) ‖ ciphertext`.
- **Why:** reuses the existing AES-GCM patterns in `src/lib/crypto/aes.ts`;
  GCM auth tag gives tamper detection (wrong password / tampered blob ->
  decrypt throws -> "couldn't unlock").
- **Alternatives:** `crypto.subtle.wrapKey` with **AES-KW** (purpose-built
  key wrap, no IV) — cleaner semantically but a separate algo path not
  otherwise used in the codebase.

### D-22.2 Recovery password skippable at pair time
- **Decision:** the "set recovery password" prompt after pairing is
  skippable, with the honest data-loss warning (copy lands in PRD-23).
- **Why:** DESIGN §12b + PRD-22 open question say prompt-but-honest;
  forcing it would block pairing. Skipping = comments unrecoverable on
  device loss until a password is set later in settings.

## PRD-21 — Pair flow UI

### D-21.1 Inviter key storage before relationship id exists
- **Decision:** store the freshly generated AES key in the existing
  IndexedDB keystore (PRD-18) under a **temp key** `invite:<code>`. When
  pairing is detected, read it back, re-store under the real
  relationship id, delete the temp entry.
- **Why:** IndexedDB persists across reloads, so inviter won't lose the
  key while waiting. Reuses PRD-18 keystore; no new storage layer.
- **Owner input given:** "indexeddb or local storage is fine."
- **Alternatives:** (a) localStorage instead of IndexedDB (simpler API,
  but splits key storage across two mechanisms); (b) id-independent
  storage / derive-on-demand (more complex, no clear benefit).
- **Cleanup risk to watch:** abandoned invites leave stale `invite:<code>`
  entries in IndexedDB. Acceptable for beta; could add a sweep later.

### D-21.2 Inviter "waiting" detection
- **Decision:** light **poll every ~3s** while the invite/QR screen is
  open, stop polling on pair success or on unmount; also refresh on tab
  focus (reuse existing focus-refresh pattern from profile store).
- **Why:** pairing happens in seconds with both people present; poll
  gives a live "waiting -> paired" flip without Supabase Realtime
  wiring. Focus-only would feel stuck while A stares at the QR.
- **Alternatives:** (a) focus-refresh only (cheapest, can feel stuck);
  (b) Supabase Realtime subscription (best UX, more moving parts / infra
  — revisit if polling feels heavy).

## PRD-20 — QR scanning

### D-20.1 Manual fallback = paste full payload
- **Decision:** when camera unavailable/denied, user pastes the full
  `v1:<code>:<keyB64>` payload string (same content the QR encodes),
  parsed via `parseInvitePayload`.
- **Why:** the AES key rides in the QR; a short code alone can't transfer
  the key, and comment E2E needs the key on both devices. Full-payload
  paste works today with zero backend change.
- **Owner input given:** owner initially suggested entering a profile ID;
  that doesn't fit the code-based `redeem_pair_code` RPC and transfers no
  key, so it was set aside in favor of full-payload paste.
- **Alternatives:** (a) code-only now + key via recovery password later
  (PRD-22) — short code but comments stay locked until PRD-22 ships;
  (b) profile-ID pairing — needs a new invite/accept RPC + RLS + still no
  key transfer (larger design change).

### D-20.2 Native BarcodeDetector, no scan library
- **Decision:** scanning uses the native `BarcodeDetector` API only; no
  `html5-qrcode` dependency added. Unsupported/denied falls back to the
  manual payload paste.
- **Why:** manual paste fully covers the unsupported case, so a heavy
  scan dep wasn't needed. Fewer deps, smaller bundle.
- **Owner input given:** "ok" to native-preferred, lib-as-fallback.
- **Alternatives:** add `html5-qrcode` as a fallback for browsers lacking
  `BarcodeDetector` (notably some iOS Safari versions) — revisit if
  real-device testing shows camera scanning is important there.

## PRD-19 — QR generation

### D-19.1 Payload format `v1:<code>:<keyB64>`
- **Decision:** compact versioned delimited string; parser splits on the
  first two colons only, so the base64 key tail stays intact.
- **Why:** base64 alphabet never contains `:`, so the format is
  unambiguous and lossless; smaller than JSON in the QR.
- **Alternatives:** JSON payload (more self-describing, larger QR).

### D-19.2 QR library `qrcode@1.5.4`
- **Decision:** `qrcode` (MIT), generation-only.
- **Owner input given:** picked `qrcode` over `qr-code-styling`.
- **Alternatives:** `qr-code-styling` (logo/dot styling we don't need).
