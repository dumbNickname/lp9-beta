# Next session — resume here

> Short orientation for the orchestrator. Read first, then follow the
> read order at the bottom. History lives in git + PRD Dev notes, not here.

## Where we are

- **Built and live** (anonymous mode, single project, GH Pages + Supabase):
  - pairing (QR / invite link / confirm), E2E-encrypted notes,
    password-wrapped key recovery;
  - hearts: composer, timeline, edit 24 h / undo 5 min, balance;
  - wishes (coupons): add / approve / gently decline / retire, starter
    ideas, per-device private flag;
  - claims (escrow): claim → yes (+ date/note) → delivered; decline /
    withdraw / cancel refund, 14-day lazy auto-refund, reminders;
  - several pairs per account (switcher, `?rel=`);
  - app shell: app bar (home, pair switcher, balance pill, ⋯ menu),
    worlds Give / My wishes / For partner, ticket cards, Coming-up
    calendar, desktop 2 columns, settings page (`#settings`);
  - installable PWA (manifest, icons, theme-colour, offline shell SW);
  - web push (opt-in, content-free): server side live; web build has
    the public key; owner device test pending.
- Status per PRD: `PROGRESS.md`. Most PRDs from 28 on are `dev-done`
  (no separate QA pass yet); SQL PRDs 27/35/41 are merged + live-smoked.

- **Design/UX pass** (invite-link fix, privacy mode rework, visual
  onboarding/pairing, paired moment, heart burst, How it works guide,
  memory jar): decisions in `WORKLOG.md`; autonomous choices in
  `no-human-decisions.md` (D-UX.*). Owner should eyeball the list at
  the bottom of `WORKLOG.md`.

## Start here (in order)

1. **"Us" visuals trial:** owner reviews garland, almanac (season /
   clock / words), milestone ribbon, wish stamps, week warmth on the
   live site and picks which stay (D-UX.7–10). Remove the rest.
2. **Push: owner tests by hand on real devices.** Server side verified
   live (heart -> trigger -> `notify` -> push sent); live build has the
   public key (Settings offers "Turn on"). Headless Chromium cannot
   subscribe to push ("permission denied"), so no automated web E2E.
   Mark PRD-53 merged after the owner's check.
3. **Unfinished reviews:** the independent review subagents timed out
   (gateway) every time. `REVIEW.md` holds the orchestrator's own
   findings. Re-run in small scopes, one per call, each ~10 min of work:
   (a) SQL/security and (b) shared lib done as review loops 1-2
   (PRD-55); still open: (c) stylesheet split (~2.4k lines), (d) UX with
   Playwright DOM probing on the live site.
4. **QA pass** on dev-done PRDs (QA agent → `tests/qa/`), then mark merged.
5. Pick polish with the owner from `REVIEW.md` UX list + `IDEAS.md`
   ("Seen while testing", watch rings, delight).

## Parked (owner decision)

- Email notifications + account linking (Google / magic link):
  `IDEAS.md` → "Parked: email + account linking".
- Phases 7 (i18n), 8 (GDPR pages: delete/export), 9 (homepage/SEO, needs
  name), 10 (pre-launch) not started.

## Deployment

- Site `https://dumbnickname.github.io/lp9-beta/`, app `…/lp9-beta/app`.
- Supabase project `mxjhablmyxeyzciyyovx` (eu-central-1). It pauses
  after about a week idle (see the AGENTS.md gotcha).
- Push/VAPID keys: kept by the owner in a private file outside the repo.

## Owner action items

- Push: none (steps 1–4 done).
- Branch protection on `master`; sign Supabase DPA before launch; pick
  the final app name (blocks Phase 9 + brand icon).

## Read order on resume

1. This file → `PROGRESS.md` → `REVIEW.md` → the PRD you work on →
   the relevant `DESIGN.md` sections.
2. Root `AGENTS.md` "Environment gotchas" (nvm, local E2E recipe,
   build timeout, `rm -rf .output`, Supabase pause, small writes).
3. Browser E2E scripts lived in `/tmp/opencode/pw/` and are likely
   gone. Recreate from the AGENTS.md recipe; moving them into
   `tests/e2e/` is `REVIEW.md` #17.
