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

## Dev notes

**Choices made:**
- Pinned `@supabase/supabase-js@2.108.2` (30+ days old, passes
  minimumReleaseAge).
- Used new `sb_publishable_` key format (Supabase 2026+ default).
  Works identically to legacy JWT anon key with `createClient()`.
- Session wired via `SessionProvider` component wrapping the router root
  in `app.tsx`. Uses `onMount` + `subscribeToAuthChanges` for reactivity.
- `supabase.ts` throws at module load time (not lazily) for missing env
  vars — fail-fast pattern.

**Files created/changed:**
- `src/lib/supabase.ts` — client singleton.
- `src/lib/session.ts` — reactive session signals + init.
- `src/components/SessionProvider.tsx` — boot-time init wrapper.
- `src/app.tsx` — wired SessionProvider.
- `.env.example` — updated comment for new key format.
- `tests/unit/supabase.test.ts` — env-var validation tests.

**Self-test results:**
- `pnpm typecheck` — pass
- `pnpm lint` — pass
- `pnpm test` — 12/12 pass (3 new tests for supabase module)
- `pnpm build` — pass (static output, no server runtime)

**Gotchas for QA:**
- Vitest 4.x lacks `vi.importModule()`. Tests use `vi.resetModules()` +
  dynamic `import()` to re-evaluate the module with different env stubs.
- The `sb_publishable_` key is short (~40 chars) vs legacy JWT (~170
  chars). QA adversarial tests should test both formats.
