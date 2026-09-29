# IDEAS.md — backlog of ideas and TODOs for later

> Parking lot. Not decisions. Promote an item into a PRD (and
> `DESIGN.md` if it changes a decision) before building it. Newest
> first within each section. Keep entries short.

## Owner actions

- Re-check the dark "ember" palette (PRD-33) on a phone.
- Supabase free tier pauses after about a week idle. Consider a weekly
  keep-alive ping (GH Actions cron hitting `/auth/v1/health`) during beta.
- Branch protection on `master` is still unset.
- Pick the final app name (blocks Phase 9).

## Parked: email + account linking (owner 2026-09-29: "park for now")

Thinking so far, to pick up when Phase 6 resumes:
- **Anonymous users have no email.** Email notifications (§8) require
  linking an identity first. Google OAuth (`linkIdentity`) keeps
  `auth.uid()` (§3) and needs the `/privacy` + `/terms` content (§11d)
  plus the Google Cloud OAuth client (owner action).
- **Alternative that fits anonymous mode:** magic-link email linking
  (`updateUser({ email })`) — no Google, and one field. But
  Supabase's built-in SMTP is rate-limited (a few/hour) and meant for
  auth mail; it's fine for linking, not for notifications.
- **Transactional mail** (claim / accepted / declined / daily hearts):
  a Supabase Edge Function + Resend (free tier ~3k/mo), triggered by a
  DB webhook on `coupon_claims` status changes, plus a daily cron
  (pg_cron -> `net.http_post`) for the throttled hearts nudge (§8b). The
  `user_settings` table (§13a) holds the toggles.
- **Content-free emails** (§8b, §15e): no titles/comments — "Ben
  answered your coupon, open the app".
- **Cheaper interim:** in-app "new since last visit" dots (no email),
  and the Web Share API to ping the partner via WhatsApp etc. manually.
- **Multi-device** also depends on linking (§10); the key comes via
  recovery password (already built).

## Discussed 2026-09-29 (owner questions)

### Notifications about new hearts?
- **Recommendation: yes, but gentle and later.** DESIGN §8 already
  planned a throttled daily email (max 1/day, content-free: "Ben
  appreciated you", no count, no preview). Email is parked (needs
  account linking).
- **Web Push via PWA** is the natural fit once installable (see below):
  works on Android + desktop; on iOS only after "Add to Home Screen"
  (iOS 16.4+). Needs a service worker + VAPID keys + a Supabase Edge
  Function to send, plus a `push_subscriptions` table. Same rules:
  opt-in, max 1/day for hearts, content-free text, immediate only for
  coupon-flow events (claim / yes / delivered).
- Anti-pattern to avoid: a push per heart (feels like likes/scoreboard).
- Interim (no infra): the in-app "new" markers (PRD-46) and the tab
  badges already exist.

### "Watch rings" gadget around the balance
- Owner idea: a smartwatch-style ring/bars around the heart number.
- **Take:** good for attractiveness, but must stay non-competitive
  (never partner vs partner, never totals). Candidate rings, all
  self-referential and gentle:
  1. **Noticing ring** — did *I* give at least one heart today / this
     week (a personal habit, e.g. 3 days a week goal chosen by the
     user). Fills with rose.
  2. **Saving ring** — progress to my next wish (balance / cheapest
     not-yet-affordable coupon). Fills with amber. This naturally
     motivates without comparing.
  3. **Together ring** — a plan in the next 7 days (Coming up has a
     dated claim). Fills with sage.
- Tap -> a small sheet explaining each ring; goals are optional and
  default off (DESIGN: "hoarding accepted", "no nudges against it").
- Risks: streak guilt. Mitigate: weekly (not daily) targets, no
  streak counter, rings reset quietly, never show the partner's ring.
- Needs a scoreboard-risk decision in DESIGN before building (§5b).

### Install as an app (PWA)
- **Recommended next polish PRD.** Add `manifest.webmanifest`
  (name=APP_NAME, `start_url` = `<base>app`, `scope` = `<base>`,
  `display: standalone`, `theme_color`/`background_color` = paper/ember),
  icons (192/512 + maskable; heart mark placeholder until branding),
  `<meta name="theme-color">` per theme (light #f4ebe0, dark #3a1f19)
  so the browser chrome matches, `apple-mobile-web-app-capable` +
  status-bar style + apple-touch-icon for iOS.
- A minimal service worker (cache the app shell for offline launch) is
  needed for Chrome's install prompt; keep data network-only.
- GH Pages sub-path: the manifest + SW must live under `/lp9-beta/`
  with the scope set; the SW must not cache Supabase requests.
- A small "Add to home screen" hint in Settings (iOS has no prompt).
- Note DESIGN §8a said "no PWA install flow in MVP"; owner now asks
  for it -> record the change in DESIGN when building.


### Seen while testing (2026-09-29)
- **Worlds redesign follow-ups (PRD-49):** the tab icons are text glyphs
  (♥ ✦ ❀); swap for custom SVGs with the brand. Maybe a swipe gesture
  between worlds on mobile. The "Give" world could show "you noticed N
  things this week" (local only, no comparison), a scoreboard-risk
  review first.
- **Balance pill animation** when hearts arrive (count-up + tiny pop)
  on the next load after a new note.
- The **recovery-password overlay after pairing** is heavy (long warning
  and 2 fields right at the happiest moment). Maybe show it after the
  first note is sent, or as a small banner "Protect your notes".
- **Onboarding archetype question** ("What describes you best?") comes
  before pairing, but the archetype belongs to the relationship. Better
  asked by the inviter when creating the invite (it's the default
  template set). When a user adds a 2nd pair the old hint is reused
  silently.
- **Hash tab + new pair**: after pairing a 2nd person the app keeps the
  `#coupons` tab. Consider jumping to Notes for a new pair.
- **"Welcome back, Anna."** duplicates the pair badge name; drop the
  eyebrow or make it time-of-day ("Good evening").
- **Claim when 0 affordable**: show "N more hearts" on the cheapest
  approved coupon (gentle, not a progress bar) — discuss scoreboard risk.
- **Partner's coupon list** can grow long; group "Ready" vs "Waiting for
  you" with small headings.
- **Composer**: after sending, the Undo affordance is on the note in the
  feed below; maybe a toast "Sent · Undo" right under the button.
- **Empty "Coming up"** takes space for new couples; hide until the
  first accepted claim.

- **Coming up -> .ics export** ("add to my calendar") for accepted
  claims with a date.
- **Delivered moment**: after "Mark delivered", prompt the claimer to
  send hearts back ("How was it?") — closes the loop without scoring.
- **Coupon "claimed N times"** stays hidden (no scoreboard); maybe show
  "last enjoyed 3 weeks ago" instead.
- **Claim confirm**: replace `window.confirm` with an in-app sheet.

- **Private nickname for partner** (only I see it, e.g. "Bear"), stored
  per relationship on my side. Asked owner 2026-09-29; unconfirmed.
- **Relationship switcher** once multi-pair UI unlocks (§4).

- **Heart comment prompts per archetype**: rotate prompts tuned to
  getting_to_know / established_couple / close_friends.
- **"Read" moment**: the first time the receiver opens a new note, give
  it a soft unfold animation; show new-since-last-visit notes first
  (local `last_seen_at`). No read receipts to the sender (avoid
  pressure).
- **Weekly "look back"**: a gentle, local-only card ("This week you
  noticed 4 things about Bob") with no numbers comparing partners. Needs
  a scoreboard-risk review before building.
- **Older notes pagination** (feed caps at 50).
- **Quick-pick phrases** ("Thank you for...", "I loved when you...") as
  chips that prefill the comment.
- **Relationship settings page** `/app/settings`: change recovery
  password, reset, theme, locale, email toggles (Phase 6 / 8).
- **Unpair / archive relationship** server-side (only local reset exists).
- **Haptics** (`navigator.vibrate(10)`) on heart select, on Android only.
- **PWA manifest + icons** for add-to-home-screen (no push; §8a still
  holds).

## Design

- Real brand face after naming: self-host a variable serif (Newsreader /
  Fraunces) with `font-display: swap`. Currently system fallbacks
  (Iowan / Palatino / Georgia).
- Subtle paper grain texture on `--color-bg` (SVG noise, very low
  opacity, respects reduced-motion/data-saver).
- Pairing screens still use the older generic layout; give them the
  card treatment and an illustration of "two phones".
- Style the privacy / terms pages (Phase 8 content).
- OG image + favicon (heart mark) once named.

## Tech debt

- `PairFlow.tsx` is 430 lines; split invite/join/confirm views.
- Store boilerplate (focus refresh) is duplicated across profile /
  relationship / points; extract a `useFocusRefresh(fn)` helper.
- CI: add a Playwright smoke against the built site (no DB) to catch
  blank-page regressions.
- Edit/undo window expiry isn't live-tested (needs time travel). Add a
  SQL test harness (pgTAP on a preview branch) someday.
- `listReceivedAmounts` pulls every row; fine for 2 users, but move to a
  `sum()` RPC if it ever matters.
