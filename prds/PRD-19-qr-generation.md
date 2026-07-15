# PRD-19 — QR generation (invite payload with embedded key)

## Goal

Generate a QR code encoding the pairing `code` plus the base64
per-relationship key, so scanning it pairs and transfers the key in one
step (§12a, §13a note).

## Scope

**In:**
- Pick the smaller of `qrcode` / `qr-code-styling`; verify permissive
  license (MIT or similar) and `minimumReleaseAge`. Record choice.
- `src/lib/pairing/qr.ts`:
  - `buildInvitePayload(code: string, keyBase64: string): string` — a
    compact, versioned payload (e.g. JSON or `v1:<code>:<keyB64>`).
  - `parseInvitePayload(payload: string): { code, keyBase64 } | null`.
- `src/components/InviteQR.tsx` — renders the QR for a given payload
  (canvas/svg), plus shows the manual `code` fallback text.

**Out:**
- Scanning (PRD-20).
- Generating the key (PRD-17) / storing it (PRD-18) — this PRD only
  embeds an already-generated key's base64.
- The full pair-flow orchestration (PRD-21).

## Touched files / new files

- `src/lib/pairing/qr.ts` — new (payload build/parse).
- `src/components/InviteQR.tsx` — new (render).
- `package.json` — add the chosen QR lib.

## Data model impact

None.

## UI behavior

Given a payload, shows a scannable QR and the manual code beneath it.

## Verification

1. `buildInvitePayload` + `parseInvitePayload` round-trip code + key.
2. `parseInvitePayload` returns null for malformed / wrong-version
   input (no throw).
3. `InviteQR` renders a QR element for a payload; the manual code is
   visible as text.
4. QR visually scannable (owner spot-check on device in PRD-21).

**Unit tests (Dev):**
- `tests/unit/pairing-qr.test.ts`: payload round-trip, version mismatch
  → null, malformed → null.
- Component smoke: `InviteQR` renders without error and shows the code.

**QA suite:**
- Adversarial: payload with injected separators / oversized key /
  missing fields → parse returns null, never throws.

## Open questions

- Payload format (JSON vs delimited) and version prefix scheme — Dev
  picks a compact, forward-compatible format and records.
- Chosen QR library + license — Dev records.
