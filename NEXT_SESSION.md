# Next session — resume here

> Short handoff for the orchestrator (chat session) picking up the
> couples gamification app. Read this first; it points you at the
> right detailed docs in the right order.

## Where we are

- Design phase **complete**. All decisions in `DESIGN.md` (SS1-17).
- **Phase 0 complete and deployed.** Static site on GitHub Pages.
- **Phase 1 complete and deployed.** Supabase client, anon auth,
  profiles table + trigger + RLS, data-access layer, onboarding form.
  Live at `https://dumbnickname.github.io/lp9-beta/app`.
- **Phase 2 IN PROGRESS** (pairing + encryption). Decomposed into
  PRD-15..23. Done so far:
  - PRD-15 (merged) — relationships + pairing_invites tables + RLS +
    `is_relationship_member` + co-member profile SELECT policy.
    Migration `0002_relationships_pairing.sql`.
  - PRD-16 (merged) — pairing RPCs: `create_pair_invite`,
    `redeem_pair_code`, `revoke_pair_invite`, `gen_pair_code`.
    Migration `0003_pairing_rpcs.sql`.
  - PRD-17 (merged) — WebCrypto AES-GCM helpers `src/lib/crypto/aes.ts`.
  - PRD-18 (merged) — IndexedDB key store `src/lib/crypto/keystore.ts`
    (added `fake-indexeddb` dev dep).
- Single GitHub repo: `dumbNickname/lp9-beta`. Git remote is `beta`
  (`git push beta master`).
- Single Supabase project, `eu-central-1` (Frankfurt), GitHub
  Integration, production branch `master`. Migrations auto-apply on push
  to master. GH Actions secrets `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` are set.

## What to do next — resume at PRD-19

Execute the remaining Phase 2 PRDs in order: **19 → 20 → 21 → 22 → 23**.

**Flagged design questions to resolve (owner input useful before coding
the wiring PRDs):**

- **PRD-19 / PRD-20 add browser libraries** (QR generation + scanning).
  PRD-19: pick smaller of `qrcode` / `qr-code-styling` (verify MIT +
  minimumReleaseAge). PRD-20: prefer native `BarcodeDetector`, add
  `html5-qrcode` only as fallback. Confirm the dependency choices.
- **PRD-20 manual fallback + key transfer:** the key rides in the QR, so
  a pasted code alone can't recover the key. Decide: (a) manual path
  also asks for the key string, or (b) code-only + key via recovery
  password later. See PRD-20 Open questions.
- **PRD-21 inviter key-before-relationship-id problem:** the AES key is
  generated before the relationship id exists. Decide storage strategy
  (temp key under invite code, migrate to rel id on consume) so the
  inviter doesn't lose the key on reload while waiting. See PRD-21 Open
  questions.

## Owner action items (parked)

- **Verify Phase 2 migrations applied** on Supabase (Table Editor should
  show `relationships`, `pairing_invites`; Database → Functions should
  show the pairing RPCs).
- **Branch protection on `master`** not yet set (discipline-only).
- **Sign Supabase DPA** before public launch (Phase 8 / 10).
- **Pick the final app name** before Phase 9 (`APP_NAME` placeholder).

## Read order on resume

1. **This file** — orientation.
2. **`PROGRESS.md`** — current PRD status table.
3. **`DESIGN.md`** — full source of truth (esp. §12a/§12b encryption +
   recovery, §13a/§13c/§13d data model for pairing).
4. The PRD you're about to execute (`prds/PRD-19..23`).
5. **`HANDOFF.md`** — strategic phase plan.

## Workflow reminders (from AGENTS.md)

- One PRD at a time: branch/work locally, run
  `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, then commit
  + `git push beta master`. Keep git history simple.
- Update `PROGRESS.md` + PRD `## Dev notes` on each PRD completion
  (do this incrementally — session may drop).
- PRD ambiguity → load `grill-me` and stop. Terse comms → `caveman`.
- SQL migrations only via `supabase/migrations/NNNN_slug.sql`.
- Learned gotchas live in root `AGENTS.md` "Environment gotchas".
