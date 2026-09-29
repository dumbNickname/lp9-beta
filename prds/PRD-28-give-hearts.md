# PRD-28 — Give hearts (composer, encryption, backdating)

> Tiny PRD per `DESIGN.md` §16b. Ambiguity -> STOP, load `grill-me`.

## Goal

A paired user can give their partner 1–5 hearts with an optional
E2E-encrypted comment (<= 200 chars) and an optional backdated event date.

## Scope

**In:**
- `src/lib/crypto/comments.ts` (new) — `encryptComment(relId, text)` ->
  `{ciphertext, iv} | null` (empty/whitespace -> null); `decryptComment
  (relId, ct, iv)` -> `string | null` (null when no key / fails). Uses
  `getKey(relId)` + `aes.ts`. Never logs plaintext.
- `src/lib/stores/points.ts` (new) — `points()` signal, `refreshPoints
  (relId)`, `usePointsFocusRefresh`, `give(...)` that calls data layer
  then refreshes (own actions feel instant, §9a).
- `src/components/HeartComposer.tsx` (new):
  - 5-heart selector (radiogroup, arrow-key accessible, `aria-label`
    "N hearts"); default none selected; send disabled until chosen.
  - Comment `<textarea>` with live counter, `maxlength=200` (§12c).
    Placeholder prompts noticing ("What did they do that you loved?").
  - "When?" — default "Today"; a small "earlier" link reveals
    `<input type=date>` with `min = today-30`, `max = today` (D-27.2).
  - **No key on device (owner decision 2026-09-29):** comment field
    disabled with a note + "Unlock with recovery password" action that
    opens `RecoveryPassword mode="restore"`; hearts-only send still
    allowed. Plaintext NEVER sent.
  - After send: gentle confirmation ("Sent. They'll see it next time
    they open the app."), form resets. Errors via `friendlyPointsError`.
- Wire into dashboard in `src/routes/app.tsx` (replaces the "Welcome
  back" line). Partner's `display_name` shown ("For Bob").

**Out:** feed (PRD-29), balance (PRD-30), bonus heart, emails (Phase 6).

## Touched files / new files

- `src/lib/crypto/comments.ts`, `src/lib/stores/points.ts`,
  `src/components/HeartComposer.tsx` (new)
- `src/routes/app.tsx`, `src/styles/global.css`
- Partner profile fetch: `src/lib/data/profile.ts` gets
  `getProfileById(id)` (RLS co-member policy already allows it).
- `tests/unit/heart-composer.test.tsx`, `tests/unit/crypto-comments.test.ts`

## Data model impact

None (uses PRD-27).

## UI behavior

See Scope. Calm, not gamified: no confetti, no streaks, no counts.

## Verification

1. Select 3 hearts, type comment, send -> RPC called with ciphertext +
   12-byte iv; plaintext absent from request args.
2. Empty comment -> ciphertext/iv null.
3. 201st char not accepted; counter shows remaining.
4. Date picker bounds: today-30..today.
5. No key -> comment disabled, restore action visible, hearts-only works.
6. Keyboard: arrow keys move heart selection; send reachable via Tab.

**Unit tests (Dev):** encrypt/decrypt round-trip with stored key; null
when key missing; composer behaviours 1–5 with mocked data layer.

## Open questions

None.
