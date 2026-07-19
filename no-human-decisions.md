# no-human-decisions.md

> Decisions the orchestrator/agents made **autonomously** while keeping
> momentum, where a human could reasonably prefer a different option.
> Review at leisure; question or override any of these and we'll do a
> follow-up PRD. Newest at top.
>
> This file is a review queue, not a source of truth. Once a decision is
> ratified or changed, move the rationale into `DESIGN.md`/the PRD and
> trim the entry here.

## PRD-22 — Password-wrapped key recovery

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
