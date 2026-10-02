# PRD-11 — Supabase client + anonymous sign-in

> Status: see `PROGRESS.md`.

## Goal

Wire a single Supabase browser client and sign every first-time visitor
in anonymously so an `auth.users` row exists for them.

## What shipped

- One Supabase browser client built from `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`; missing either fails fast with a clear error
  (no silent undefined).
- On app boot: if there is no session, sign in anonymously; the current
  session/user is exposed reactively to the app.
- Session persists in localStorage, so a reload resumes the same
  anonymous user. Invisible to the user.
- Owner enables **Anonymous Sign-in** in the Supabase dashboard (Auth ->
  Providers).
- Only the public anon/publishable key reaches the bundle, never
  `service_role`.
- Out: `profiles` table (PRD-12), data-access layer (PRD-13), Google
  account linking (Phase 8).

## Decisions

- Pinned a mature `@supabase/supabase-js` 2.x (passes pnpm minimum
  release age).
- Uses the new `sb_publishable_` key format; the legacy JWT anon key
  works identically.
- Missing env is a fail-fast error, originally thrown at module load.

## Verification

- Unit: client throws without env vars, constructs with them.
- QA: garbage/empty key fails clearly without a crash loop; bundle key
  is the anon one.
- Live: one anonymous `auth.users` row per fresh browser, same user
  after reload.

## Gotchas

- Modules that throw at load need module reset + dynamic import in
  tests to re-evaluate with different env stubs.
- Test both key formats: `sb_publishable_` is short (~40 chars), legacy
  JWT is long.

## Later changes

- Client is now created lazily on first use, not at module load:
  prerender runs without `VITE_*` env (root and `src/` AGENTS.md). The
  clear missing-env error still holds, raised on first use.
