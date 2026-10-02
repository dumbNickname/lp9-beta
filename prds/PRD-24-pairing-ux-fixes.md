# PRD-24 — Pairing UX fixes (deep-link QR, copy, iOS scan fallback)

> Status: see `PROGRESS.md`. Later changes below.

## Goal

Make pairing work on real devices. Owner manual testing of Phase 2
pairing (PRD-19..21) found: manual paste was dead (only the short code
was shown, but Join needs the full payload; no copy button); in-app
scanning was dead on iOS (no `BarcodeDetector`); the iOS Camera app
reported "No usable data" because the QR held raw text, not a URL.

## What shipped

- **Deep-link invite URL:** the QR encodes
  `<origin><basePath>app#pair=<encodeURIComponent(v1:code:keyB64)>`.
  The key rides only in the URL fragment, which browsers never send to
  the server. The wire payload `v1:<code>:<keyBase64>` is unchanged
  inside it. Base path follows the deployed sub-path (`/lp9-beta/`).
- Parsing splits the fragment on `&` and reads `pair` (so combined
  fragments work); null on missing/empty/malformed; never throws.
- Join input normaliser: accepts a full invite URL (needs a valid
  `pair=`) or a bare `v1:...` payload; format validation stays in the
  payload parser. Used by scanner, deep link and manual paste alike.
- Invite screen: selectable full invite link + "Copy invite link"
  (Clipboard API; on failure or no API, the field is selected for manual
  copy).
- **iOS scan fallback:** `html5-qrcode@2.3.8` (Apache-2.0) used only when
  native `BarcodeDetector` is absent; lazy-loaded inside scan start, so it
  is a separate client chunk, never in SSR/prerender or the initial
  bundle. The old "scanning not supported" dead end is gone; native stays
  preferred and degrades to an "unavailable" notice with manual entry.
- Camera is released on decode, stop and unmount on both paths
  (idempotent stop; a disposed guard covers unmount mid-start).
- Deep-link consume on app load: a device is inviter XOR joiner; a
  pending invite wins, otherwise `#pair=` is read and the fragment is
  stripped so it cannot re-trigger.
- Out: wire format change; recovery copy (PRD-22/23); multi-pair UI.

## Decisions

- **D-24.1** Payload in the URL fragment (`#pair=`), not the query, so the
  key never reaches a server request line. Key exposure in browser
  history is an owner-accepted tradeoff.
- `encodeURIComponent` on build / decode on parse: base64 `+`/`/`/`=` would
  otherwise be ambiguous in a fragment (`+` as space, `=` vs params).

## Verification

- Unit + QA: URL build/parse round-trip (fuzzed keys with `+`/`/`/`=`),
  null-safety on junk, proof nothing precedes `#` except
  `<origin><base>app`; copy puts the full link on the clipboard; fallback
  selected when native absent; camera released on both paths; deep link
  clears the fragment.
- Build check: html5-qrcode absent from the app entry and SSR bundles.
- Owner iOS/device checks still pending: iOS Camera scans QR -> opens
  app -> pairs; in-app scan on iOS Safari/Chrome decodes via fallback;
  camera light off after leaving Join; two-device pair end to end with no
  key in any network request; built invite URL uses `/lp9-beta/`.

## Gotchas

- The native scanner path could not be exercised in jsdom (video ref
  timing); whether it decodes in a real browser is a device question.

## Later changes

- PRD-25: scan/paste/link no longer auto-redeem; they open a confirm
  step (D-25.1). The standalone short code was removed (D-25.3).
- Design session 2026-10-01: `#pair=` is captured once at app start into
  memory (never storage) and stripped, so it survives onboarding;
  previously the pair flow consumed it on mount. Joiner via link sees
  "<inviter> is waiting for you" and a one-tap "Join <name>" (D-UX.1);
  an already-paired user opening a link enters the new-pair flow
  (D-UX.2).
- Pairing UI redesigned (two big Invite/Join tiles, avatars, Web Share
  "Send link"), superseding PRD-47 polish.
