# Next session — resume here

> Short orientation for the orchestrator. Read first, then follow the
> read order at the bottom.

## Where we are (2026-09-29)

- Phases 0–2 merged: static site, anon auth, profiles, pairing (QR /
  deep link / confirm), E2E key, password-wrapped recovery.
- **Phase 3 (hearts) built:** PRD-27 merged + live-verified. PRD-28..32
  are `dev-done` in one slice: composer, timeline with edit/undo
  windows, balance, privacy mode, and the new warm editorial design
  system + homepage.
  - DB: `supabase/migrations/0006_points.sql` (`points` + RLS SELECT
    only + `give_points` / `edit_point_comment` / `delete_point`).
  - Live smoke 2026-09-29: 20/20 RPC/RLS checks pass. A browser E2E
    (2 anon partners, built site) paired, sent hearts, and the partner
    decrypted the comment. No horizontal scroll at 390px in light or
    dark.
  - bytea `\x` hex round-trip verified on the live DB.
- CI (`deploy.yml`) now runs typecheck, lint and test before build.
- Owner decisions this session are recorded in `no-human-decisions.md`
  (Phase 3 section): 30-day backdate, one timeline, per-entry hearts
  with no totals, hearts-only when there's no key, paper + ink design.

## What to do next

1. Owner eyeballs the deployed design on a phone. Tune tokens or
   veto. Then mark PRD-28..32 `qa-done` → `merged` (QA agent can write
   adversarial suites under `tests/qa/`).
2. Phase 3 is effectively done, so decompose **Phase 4 (wishlists +
   coupon approval)** into PRDs (`HANDOFF.md` Phase 4, `DESIGN.md`
   §6, §13a coupons, §15b per-coupon private flag).
3. Backlog and polish ideas are in `IDEAS.md`.

## Deployment URLs

- `https://dumbnickname.github.io/lp9-beta/` — home (hero + How it works)
- `https://dumbnickname.github.io/lp9-beta/app` — app. Use two browsers
  to pair and try hearts.
- Supabase project `mxjhablmyxeyzciyyovx` (eu-central-1). It pauses
  after about a week idle; see the AGENTS.md gotcha.

## Owner action items

- Branch protection on `master` (still discipline-only).
- Consider a keep-alive ping for the free-tier pause (`IDEAS.md`).
- Sign the Supabase DPA before public launch.
- Pick the final app name before Phase 9.

## Read order on resume

1. This file → `PROGRESS.md` → `DESIGN.md` (sections referenced by the
   next PRD) → the PRD → `HANDOFF.md` if strategic.
2. The root `AGENTS.md` gotchas cover the env (nvm, local E2E recipe,
   build timeout, Supabase pause).
