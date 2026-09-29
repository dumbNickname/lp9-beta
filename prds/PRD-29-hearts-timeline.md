# PRD-29 — Hearts timeline (decrypt, edit/delete windows)

> Tiny PRD per `DESIGN.md` §16b. Ambiguity -> STOP, load `grill-me`.

## Goal

Dashboard shows one chronological timeline of hearts received **and**
given in the relationship, comments decrypted client-side, with the
§5d edit (24h) and silent delete (5 min) affordances for the giver.

## Scope

**In:**
- `src/components/HeartsFeed.tsx` + `HeartNote.tsx` (new).
- One timeline, newest first (owner decision 2026-09-29). Received notes
  are the visual focus; given notes are quieter ("You -> Bob").
- Per entry: N small hearts (amount shown per entry; **no totals, no
  sums, no counts anywhere** — owner decision), decrypted comment,
  relative date from `event_date` (+ "noted <created_at>" only when
  backdated), "edited" badge when `edited_at` set (§5d; no original).
- Undecryptable comment (no key / wrong key) -> "Comment locked on this
  device" + restore link (reuses `RecoveryPassword mode="restore"`).
- Giver actions, shown only inside window, computed from `created_at`
  vs `Date.now()` (server remains the authority):
  - **Edit** comment while < 24h: inline textarea, re-encrypts with a
    fresh IV, calls `editPointComment`.
  - **Undo** (delete) while < 5 min: one tap, no confirm (it's an
    "oops" affordance), row disappears; silent to partner.
- Manual refresh button + focus refresh (§9a). Empty state copy that
  invites noticing, not scoring ("Nothing yet. Notice one small thing
  today.").
- Pagination: first 50 only; "older" deferred (idea list).

**Out:** privacy-mode veil (PRD-31), balance (PRD-30).

## Touched files / new files

- `src/components/HeartsFeed.tsx`, `src/components/HeartNote.tsx` (new)
- `src/lib/stores/points.ts` (decrypt cache, edit/delete actions)
- `src/lib/format/date.ts` (new) — `Intl.RelativeTimeFormat` helpers
- `src/routes/app.tsx`, `src/styles/global.css`
- `tests/unit/hearts-feed.test.tsx`, `tests/unit/format-date.test.ts`

## Data model impact

None.

## Verification

1. Received + given entries interleaved by `created_at desc`.
2. Decrypted text shown; missing key -> locked placeholder.
3. Edit visible for giver < 24h only; never for receiver.
4. Undo visible for giver < 5 min only; removes the entry.
5. `edited_at` -> "edited" badge on both sides.
6. No aggregate number rendered anywhere in the feed.

## Open questions

None.
