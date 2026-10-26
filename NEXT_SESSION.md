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
  - claims (escrow): claim → yes (+ date/note) → done (either partner taps "We did it"); decline /
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

- **Migration 0016 (explicit table grants)** pushed: verify the live
  beta with the two-client smoke (hearts, wishes, claims, profile edit,
  push subscribe) and that `anon` gets 42501 on every table.

0. **PRD-57 production environment** is built (dev-done). Owner works
   through `docs/production-setup.md` (Cloudflare, Supabase, GitHub,
   OVH DNS); then the agent pushes `release`, E2E-checks both sites and
   the keep-alive logs, and marks PRD-57 merged. Next PRD: weekly prod
   backup (D-57.11) before real users.
1. **"Us" visuals trial:** owner reviews garland, almanac (season /
   clock / words), milestone ribbon, wish stamps, week warmth on the
   live site and picks which stay (D-UX.7–10). Remove the rest.
2. **Push: confirm visible on screen.** Whole chain verified on the
   owner's device (Chrome on macOS, FCM): Send test -> `sent:1`, but
   even the Local test (no server) stays invisible, so macOS hides
   Chrome notifications, or a reused tag silently replaced an old
   one in the tray (now `renotify: true`, unique local tags, Page test
   + Clear held + held count in debug). cleverpush.com shows on the
   same Chrome, app not installed. Root cause found: both macOS
   "Google Chrome" notification entries were off; owner to enable
   and re-test, then test on the phone. Paired moment now has a
   one-tap notifications ask (owner choice). Hearts now push on every heart (no 20 h cap,
   migration 0015). Next: owner fixes macOS settings and re-tests with
   a real heart from the partner; if visible, mark PRD-53 merged. Open
   proposals (not built): `urgency: high` in `notify` for idle Android,
   in-flow "Turn on" card, `pushsubscriptionchange` + re-save on app
   start. If still not visible,
   follow the "This device (debug)" table in `docs/push-setup.md` (OS
   notification settings for the browser). Headless Chromium cannot
   subscribe to push, so no automated web E2E.
   Debug UI lives behind `?debug=true`; decide later whether to keep it.
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

- Beta: Cloudflare Worker `endeary-beta.<account>.workers.dev` from
  `master` (`pnpm deploy:beta` by hand); until the owner adds the
  Cloudflare secrets, the old `dumbnickname.github.io/lp9-beta/` keeps
  its last deploy. Supabase beta project `mxjhablmyxeyzciyyovx`
  (eu-central-1).
- Production: `endeary.com` on GitHub Pages from `release`, own Supabase
  project (not created yet). Steps: `docs/production-setup.md`.
- Keep-alive: daily cron on the beta Worker pings both projects.
- Push/VAPID keys: kept by the owner in a private file outside the repo.

## Owner action items

- Push: none (steps 1–4 done).
- Branch protection on `master`; sign Supabase DPA before launch; name is
  Endeary, domains `endeary.com` + `endeary.pl` bought at OVH (renew
  yearly; DNS still OVH defaults). OVH done: email confirmed, 2FA, auto-renew,
  DNSSEC on `.pl`; mailbox later. Production setup: `docs/production-setup.md`.

## Read order on resume

1. This file → `PROGRESS.md` → `REVIEW.md` → the PRD you work on →
   the relevant `DESIGN.md` sections.
2. Root `AGENTS.md` "Environment gotchas" (nvm, local E2E recipe,
   build timeout, `rm -rf .output`, Supabase pause, small writes).
3. Browser E2E scripts lived in `/tmp/opencode/pw/` and are likely
   gone. Recreate from the AGENTS.md recipe; moving them into
   `tests/e2e/` is `REVIEW.md` #17.
