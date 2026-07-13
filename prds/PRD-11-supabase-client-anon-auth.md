# PRD-11 — Supabase client + anonymous sign-in

## Goal

Wire a single Supabase browser client and sign every first-time visitor
in anonymously so an `auth.users` row exists for them.

## Scope

**In:**
- `@supabase/supabase-js` dependency (pin mature version).
- `src/lib/supabase.ts` — one client from `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY`; throws a clear error if either is missing.
- Anonymous sign-in on app boot: if no session, call
  `signInAnonymously()`; expose current session/user reactively.
- `.env.example` already lists both vars (PRD-06); confirm.
- Owner enables **Anonymous Sign-in** in Supabase dashboard (Auth →
  Providers) — documented here.

**Out:**
- `profiles` table + trigger (PRD-12).
- Google OAuth linking (Phase 8).
- Data-access layer abstraction (PRD-13).

## Touched files / new files

- `package.json` — add `@supabase/supabase-js`.
- `src/lib/supabase.ts` — new.
- `src/lib/session.ts` (or a Solid resource/context) — new: reactive
  current-user accessor + boot-time anon sign-in.

## Data model impact

None (uses built-in `auth.users`; no custom tables yet).

## UI behavior

Invisible: on first load an anonymous user is created; on reload the
existing session resumes.

## Verification

1. Fresh browser → app boot creates an anonymous user; the same user
   persists across reload (session in localStorage).
2. `auth.users` shows one anonymous row per fresh browser (owner checks
   dashboard on a preview branch).
3. Missing env vars → client construction throws a clear message, not a
   silent undefined.

**Unit tests (Dev):**
- `src/lib/supabase.ts` throws when env vars absent; constructs when
  present (mock env).

**QA suite:**
- Adversarial: garbage/empty anon key → clear failure, no crash loop.
- Verify the anon key in the bundle is the anon (not service_role) key.

## Open questions

(none)
