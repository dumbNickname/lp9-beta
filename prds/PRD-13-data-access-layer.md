# PRD-13 — Data-access layer + reactive profile store

> Status: see `PROGRESS.md`.

## Goal

Provide a thin, swappable data-access layer and a reactive profile store
with `refresh()`, so all Supabase reads/writes funnel through one place
(`DESIGN.md` §9c).

## What shipped

- Typed profile access: read my profile, update my profile (patch).
  Row types hand-typed for MVP.
- All Supabase access goes through the data layer; components never
  call the client directly. Later entities follow the same pattern.
- Reactive profile store with `refresh()`, plus refetch on tab
  focus/visibility change.
- Out: onboarding UI (PRD-14), other entities (later phases), Supabase
  Realtime (deferred, §9b).

## Decisions

- Focus refresh throttled to 2s so one focus means one refetch (no
  thrash).
- "No rows" returns null, not an error: a brand-new user may briefly
  have no profile until the trigger fires.
- Profile update is limited to the caller's row (originally by RLS
  alone; see Later changes).

## Verification

- Unit (mocked client): correct table/columns, row mapping, `refresh()`
  updates the store.
- QA: patching fields the user must not set (e.g. `id`) is
  ignored/rejected; focus refresh does not thrash; no client import
  outside the lib layer.

## Gotchas

- PostgREST needs explicit filters even under RLS (root AGENTS.md).

## Later changes

- Profile reads/updates now filter by the caller's id explicitly, not
  RLS alone.
- Stores also ignore stale responses after a pair switch (`src/`
  AGENTS.md).
