# IDEAS.md — backlog of ideas and TODOs for later

> Parking lot. Not decisions. Promote an item into a PRD (and
> `DESIGN.md` if it changes a decision) before building it. Newest
> first within each section. Keep entries short.

## Owner actions

- Re-check the dark "ember" palette and the app shell on a phone.
- Finish push setup (`docs/push-setup.md`).
- Supabase free tier pauses after about a week idle. Consider a weekly
  keep-alive ping (GH Actions cron hitting `/auth/v1/health`) during beta.
- Branch protection on `master` is still unset.
- Pick the final app name (blocks Phase 9).

## Parked: email + account linking

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

## Discussed with owner

### Notifications about new hearts?
- **Built as web push: PRD-53** (owner setup in `docs/push-setup.md`).
  Open follow-ups: per-event toggles in Settings (`user_settings` §13a),
  quiet hours, and a daily digest mode instead of per-event coupon pushes.
- Original reasoning: **yes, but gentle.** DESIGN §8 already
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
- **Owner clarification: not for comparison — just fun data
  visualisation.** So no goals/pressure needed; rings can simply show
  e.g. hearts given this week, progress to the next wish, plans coming
  up.
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
- Done: PRD-52. Open follow-ups: real brand icon once named; a subtle
  "install" hint on the home page for mobile visitors.

### Seen while testing
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
- **Private nickname for partner** (only I see it, e.g. "Bear"), stored
  per relationship on my side. Asked owner; unconfirmed.
- **Heart comment prompts per archetype**: rotate prompts tuned to
  getting_to_know / established_couple / close_friends.
- **Appreciation symbol per pair** (owner agreed): hearts read romantic,
  awkward for close friends. Default by archetype (close friends =
  star; getting to know = owner to pick, maybe star), pair can change it
  in Settings. Copy follows the symbol ("Send a star", star balance),
  not only the icon. Different symbols also tell pairs apart.
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
- **Unpair / archive relationship** server-side (only local reset exists).
- **Haptics** (`navigator.vibrate(10)`) on heart select, on Android only.
## Design

- Real brand face after naming: self-host a variable serif (Newsreader /
  Fraunces) with `font-display: swap`. Currently system fallbacks
  (Iowan / Palatino / Georgia).
- Subtle paper grain texture on `--color-bg` (SVG noise, very low
  opacity, respects reduced-motion/data-saver).
- Pairing screens have cards now (PRD-47); still missing an
  illustration of "two phones".
- Replace text-glyph icons (♥ ✦ ❀ ◔ … ➜ ✓) with one small SVG icon set
  (`REVIEW.md` UX #3).
- **Delight moments** (no gamification pressure): a soft heart burst when
  a note is sent; an "unfold" animation the first time a new note is
  read; a warm full-card moment on "Delivered" ("How was it?" -> send
  hearts back); the balance pill counts up when new hearts arrived.
- Style the privacy / terms pages (Phase 8 content).
- OG image + favicon (heart mark) once named.

## Tech debt

(See `REVIEW.md` for the ranked list; items below are not duplicated
there.)

- CI: add a Playwright smoke against the built site (no DB) to catch
  blank-page regressions.
- Edit/undo window expiry isn't live-tested (needs time travel). Add a
  SQL test harness (pgTAP on a preview branch) someday.
- `listReceivedAmounts` pulls every row; fine for 2 users, but move to a
  `sum()` RPC if it ever matters.
