# PRD-27 — `points` table + RLS + RPCs + data layer

> Tiny PRD per `DESIGN.md` §16b. Ambiguity -> STOP, load `grill-me`.

## Goal

Server + data-layer foundation for hearts: a `points` table with RLS and
three RPCs (`give_points`, `edit_point_comment`, `delete_point`) that
enforce the §5c/§5d rules, plus typed client wrappers.

## Scope

**In:**
- Migration `supabase/migrations/0006_points.sql`:
  - `public.points` per `DESIGN.md` §13a: `id`, `relationship_id`,
    `giver_id`, `receiver_id`, `amount int check (amount between 1 and 5)`,
    `comment_ciphertext bytea null`, `comment_iv bytea null`,
    `edited_at`, `event_date date not null`, `created_at timestamptz
    not null default now()`, `deleted_at timestamptz null`. FKs cascade on
    relationship/profile delete. Check: ciphertext and iv both null or
    both non-null; `octet_length(comment_iv) = 12`;
    `octet_length(comment_ciphertext) <= 1024`; `giver_id <> receiver_id`.
  - Indexes §13e: `(relationship_id, created_at desc)`,
    `(receiver_id, created_at desc)`.
  - RLS enabled. **Only** a SELECT policy:
    `is_relationship_member(relationship_id) and deleted_at is null`
    (silent delete: deleted rows invisible to both partners). No
    INSERT/UPDATE/DELETE policies — all writes via RPCs (D-27.1).
  - `give_points(p_rel_id uuid, p_amount int, p_ciphertext bytea,
    p_iv bytea, p_event_date date) returns uuid` — `security definer`,
    `set search_path = ''`. Checks: authenticated; member; relationship
    `status = 'active'`; amount 1..5; `p_event_date` between
    `current_date - 30` and `current_date + 1` (the +1 tolerates clients
    ahead of UTC; D-27.2); ciphertext/iv pairing. `receiver_id` is
    derived server-side as the other member (never trusted from client).
    `giver_id = auth.uid()`.
  - `edit_point_comment(p_point_id uuid, p_ciphertext bytea, p_iv bytea)
    returns void` — giver only; not deleted; `created_at > now() -
    interval '24 hours'`; sets ciphertext/iv + `edited_at = now()`.
    Null/null allowed (removes comment). Amount never editable.
  - `delete_point(p_point_id uuid) returns void` — giver only;
    `created_at > now() - interval '5 minutes'`; sets `deleted_at =
    now()`.
  - Exception messages (stable, mapped client-side): `not authenticated`,
    `not a relationship member`, `relationship not active`,
    `invalid amount`, `invalid event date`, `invalid comment`,
    `not found`, `not the giver`, `edit window closed`,
    `delete window closed`.
- `src/lib/data/types.ts` — `Point` type (bytes decoded to `Uint8Array`).
- `src/lib/data/bytea.ts` (new) — move `bytesToBytea`/`byteaToBytes`
  out of `relationship.ts` (export them; `relationship.ts` imports).
- `src/lib/data/points.ts` (new) — `listPoints(relId, limit=50)` (ordered
  `created_at desc`, explicit `.eq("relationship_id", relId)`),
  `givePoints(...)`, `editPointComment(...)`, `deletePoint(...)`,
  `friendlyPointsError(err)`.

**Out:** UI (PRD-28/29), balance (PRD-30), bonus heart (§5a, hidden).

## Touched files / new files

- `supabase/migrations/0006_points.sql` (new)
- `src/lib/data/bytea.ts` (new), `src/lib/data/relationship.ts` (import)
- `src/lib/data/points.ts` (new), `src/lib/data/types.ts`
- `tests/unit/points-data.test.ts` (new), `tests/unit/bytea.test.ts` (new)

## Data model impact

New table `points`, 3 RPCs, 1 RLS policy. See Scope.

## UI behavior

None.

## Verification

1. Migration applies cleanly on the Supabase preview/prod branch.
2. Live smoke (two anon clients, paired): A gives 3 hearts + ciphertext ->
   both A and B can SELECT it; B cannot call `edit_point_comment` /
   `delete_point` on it (`not the giver`); A edits -> `edited_at` set;
   A deletes within 5 min -> row invisible to both.
3. `give_points` rejects amount 0/6, event_date 31 days ago, future
   +2 days, non-member relationship, iv of wrong length.
4. Direct `insert`/`update`/`delete` on `points` via PostgREST fails (RLS).
5. Bytea round-trip for ciphertext/iv reads back identical bytes.

**Unit tests (Dev):** data wrappers call the right RPC names/args with
`\x` hex bytea; `listPoints` decodes bytea and filters by relationship;
friendly error mapping; bytea helpers round-trip.

**QA suite:** SQL text assertions on the migration (security definer,
search_path, windows, receiver derived), adversarial arg shapes.

## Open questions

None (decisions D-27.1, D-27.2 in `no-human-decisions.md`).
