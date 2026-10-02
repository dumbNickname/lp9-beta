# PRD-27 — `points` table + RLS + RPCs + data layer

> Status: see `PROGRESS.md`.

## Goal

Server and data-layer foundation for hearts: a `points` table with RLS and
three RPCs that enforce the `DESIGN.md` §5c/§5d rules, plus typed client
wrappers.

## What shipped

- Table `points` (§13a): relationship, giver, receiver, `amount` 1..5,
  optional encrypted comment (ciphertext + 12-byte IV, both or neither,
  ciphertext 1..1024 bytes; empty comment must be null/null), `edited_at`,
  `event_date`, `created_at`, `deleted_at`. Giver differs from receiver.
  Cascades on relationship/profile delete. Indexed by relationship and by
  receiver, newest first (§13e).
- RLS: only a SELECT policy (member of the relationship and not deleted).
  No write policies; all writes via `security definer` RPCs with empty
  `search_path`.
- `give_points(rel, amount, ciphertext, iv, event_date) -> uuid`: caller
  must be an authenticated member of an active relationship; amount 1..5;
  event date from 30 days ago up to tomorrow (server UTC). Giver is the
  caller; receiver is derived server-side as the other member.
- `edit_point_comment(point, ciphertext, iv)`: giver only, not deleted,
  within 24h of creation; sets `edited_at`; null/null removes the comment.
  Amount is never editable.
- `delete_point(point)`: giver only, within 5 minutes; soft delete,
  silent to the partner.
- Stable error messages mapped to friendly copy client-side:
  `not authenticated`, `not a relationship member`,
  `relationship not active`, `invalid amount`, `invalid event date`,
  `invalid comment`, `not found`, `not the giver`, `edit window closed`,
  `delete window closed`.
- Data layer: list latest 50 points per relationship (explicit
  relationship filter), give/edit/delete wrappers, a separate
  received-amounts read for the balance (PRD-30, D-30.1), shared bytea
  hex helpers.

Out: UI (PRD-28/29), balance (PRD-30), bonus heart (§5a, hidden).

## Decisions

- **D-27.1** All writes via RPC, no INSERT policy. Why: receiver cannot
  be spoofed; one place enforces the windows.
- **D-27.2** `event_date` upper bound is server `current_date + 1`. Why:
  server is UTC, clients ahead of UTC have a later "today"; the UI still
  caps at local today.
- **D-27.3** Deleted points are hidden by the SELECT policy itself, so
  silent delete is enforced server-side for both partners.

## Verification

- Live smoke against prod with two paired anonymous users: give, partner
  reads, amount/date/IV rejections, outsider blocked and sees nothing,
  partner cannot edit/delete, direct insert/update blocked by RLS, edit
  sets `edited_at`, backdated give, delete hides from both.
- Unit tests for wrappers, bytea round-trip and error mapping; QA SQL
  assertions on the migration.
- Not live-tested: expiry of the 24h and 5-minute windows (needs time
  travel).

## Gotchas

- PostgREST returns `bytea` as `\x` hex; encode/decode explicitly.
