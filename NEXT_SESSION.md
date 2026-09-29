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
- **Phase 4 (wishlists) built:** PRD-35 merged (migration
  `0007_coupons.sql`, live smoke 21/21). PRD-36..39 dev-done: a
  Notes/Coupons tab (`#coupons`), my list + partner's list, approve /
  gentle decline / retire, starter templates, per-coupon private flag.
  The live-site browser E2E (2 partners) passes 14/14.
- PRD-33 (ember dark palette + sand/glow light) and PRD-34 (pair badge
  + edit own name) are dev-done per owner feedback.
- **Phase 5 (claims/escrow) built:** PRD-41 merged (migration
  `0008_coupon_claims.sql`, live smoke 30/30 incl. the parallel-claim
  race). PRD-40 (affordable highlight), PRD-42 (claim UI + Coming-up
  14-day strip + history) and PRD-43 (multi-relationship switcher,
  `?rel=`) are dev-done. The live 3-user browser E2E passes 18/18
  (give -> approve -> claim -> accept w/ date -> deliver; A pairs with a
  2nd partner and switches).
- CI (`deploy.yml`) now runs typecheck, lint and test before build.
- Owner decisions this session are recorded in `no-human-decisions.md`
  (Phase 3 section): 30-day backdate, one timeline, per-entry hearts
  with no totals, hearts-only when there's no key, paper + ink design.

## What to do next

1. Owner tries the full loop on phones (hearts -> wish -> yes -> claim
   -> plan -> delivered), and a 2nd pair via "Add someone".
2. QA pass on the dev-done PRDs (28–34, 36–40, 42, 43), then mark them
   merged.
3. Phase 6 (email notifications) needs owner input: Supabase SMTP only
   works for auth emails, so transactional mail probably needs an Edge
   Function + provider (Resend). Anonymous users have no email at all,
   so email needs Google linking first (Phase 1 left linking undone).
   Grill before decomposing.
4. Backlog and polish are in `IDEAS.md`.

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
