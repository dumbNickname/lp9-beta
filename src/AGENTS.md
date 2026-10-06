# src/AGENTS.md

## Purpose

The web app: public pages (statically generated) and the `/app` single-
page shell where pairs give hearts, wish and claim.

## Ownership

- Owns application code, styles and static assets of the app.
- Build/test/lint config is owned by the root contract.

## Local Contracts

**Platform**
- Product name comes from one constant; never hard-code it (§14i).
- GitHub Pages sub-path: the router must be given the base path, and
  `<base href>` is set, so history URLs must always be absolute
  (path + query + hash). A bare `#x` drops `/app`.
- `/app` deep links rely on the 404 → shell fallback; keep it client-
  routed.
- Supabase client is created lazily (prerender has no `VITE_*` env).
  All database calls live in the data layer; stores hold signals,
  refresh on focus, and ignore stale responses after a pair switch.
- Browser storage access is always wrapped (private mode, SSR).

**Look and feel**
- Warm editorial "paper + ink"; dark theme is "ember" (terracotta, not
  grey). Colours only via semantic tokens; text ≥ 4.5:1 in both themes.
- Serif for display and heart notes, sans for UI. SVG hearts and line
  icons, no emoji glyphs in UI (wish emoji are user content).
- Three colour-coded worlds: Give (rose), My wishes (amber), For partner
  (sage). World styles inherit the world colour.
- Visual over text: one short line per idea; illustrated empty states.
- Tasteful motion is welcome (heart burst on send, paired moment, jar,
  balance pulse); all motion off under reduced-motion. No streaks,
  progress bars, scores or comparisons.
- CSS logical properties only (RTL-ready).

**Pairing**
- Invite link carries the encryption key in the URL fragment. The app
  reads it once on open, strips it from the URL and holds it in memory
  only (never storage) until join or cancel, so it survives onboarding.
- Joiner via link sees who invited them; one "Join <name>" tap pairs.
  An already-paired user opening an invite lands in the new-pair flow;
  if that invite is already used, they go straight back to their pair.
- The inviter's key is moved onto the new pair by whichever notices the
  pair first: the waiting-screen poll or any later refresh. Background
  tabs freeze the poll, so the refresh path is required.
- Both sides see a full-screen "paired" moment, then the optional
  recovery-password prompt.

**Shell stability**
- Loading gates apply to the first load only; later refreshes update
  in place. The dashboard remounts only when the pair id changes.
  Otherwise refreshes wipe drafts, scroll and one-shot inputs.

**Privacy mode** (§15c)
- Off by default, remembered per device. One eye switch in the app bar
  (mirrored in Settings). Veiled notes/private wishes are tappable:
  show this one / turn mode off / keep hidden. Anything showing note
  text must honour it.

**App shell**
- App bar: pair switcher, heart balance, eye, more menu. Mobile = two
  rows (pair name gets the width; balance is a full-width wallet strip);
  desktop = one row. Sticky elements offset by the measured bar height.
- More menu holds How it works (visual guide), Settings, Home.
- Give world includes the memory jar (partner notes, tap for a random
  one); the jar shows fullness, never a count.
- "Us" visuals (trial, owner reviews which stay): garland of the last
  14 days, almanac card (season dots, day clock, my words), shared
  milestone ribbon, wish stamp card, week warmth tint. Computed on the
  device from the decrypted feed; never split per partner (words show
  only my own notes and hide in private mode); day peeks honour private
  mode.
- In-app confirm sheets only, never native dialogs.
- Layering: section heads < site header < tab bar < app bar/popovers <
  sheets < paired moment. Hints/coachmarks sit in the page flow and
  never cover controls.
- Every device-local storage key must also be cleared by Reset account.
- `?debug=true` reveals owner diagnostics (Settings → Notifications:
  test push, device report, local test). Never shown without it.

**Money rules**
- Balance is computed, never stored, and only your own is shown (§13b).

## Work Guidance

- No scoreboards (§5b). Non-comparing playful visuals are fine.
- Copy: warm, short, honest about anonymity and encryption (§3); no raw
  timestamps by default.
- Mobile first; check 360px and 1280px for overflow and layering.
- Desktop may pre-open forms; mobile keeps them collapsed.
- The stylesheet has duplicates; edit an existing rule before adding one.

## Verification

- Typecheck, lint and tests (root contract).
- UI changes: local static build + browser DOM audit, then re-run on
  the live site after deploy.

## Child DOX Index

- None.
