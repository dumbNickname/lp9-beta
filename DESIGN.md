# Couples Gamification App — Design Decisions

> Living document. Captures decisions made during the design grilling session.
> Append to this file as new decisions are made. Do not silently revise past
> decisions — strike them through and add a dated note explaining the change.

## Product concept (1-paragraph summary)

A web app that helps couples (and close friends) strengthen their relationship
by gamifying mutual appreciation. Partners give each other **points** with a
short **comment** for nice things they did. Points accumulate over time and
**unlock coupons** that the couple has agreed on (e.g. "movie night",
"gym together"). Each partner defines their own coupon list — both sides must
feel good about every item. The product goal is to train people to notice and
verbalize appreciation that day-to-day life often leaves unsaid.

Stretch idea: a "ping" so a person can flag they did something nice in case
the partner missed it (because they didn't have their phone, etc.).

## Decisions so far

### 1. Architecture: **NOT pure WebRTC P2P**
- **Decision:** Use a real backend with a database. Pure P2P rejected.
- **Why:** Async usage (partners rarely online together), durability (cleared
  browser = lost shared history), required signaling server anyway, and the
  ping feature inherently requires async delivery.

### 2. Backend: **Supabase**
- **Decision:** Supabase (Postgres + Auth + Realtime) on the free tier.
- **Why:** Eliminates an entire backend layer — RLS lets the SolidJS frontend
  talk directly to Postgres. Built-in Google OAuth + anonymous users +
  Realtime subscriptions (live "partner gave you points" updates).
- **Caveats noted:** Free-tier project pauses after 1 week of inactivity (can
  be resumed; cron-ping if needed). Data access should go through a thin
  abstraction so the engine is swappable later.

### 3. Authentication model: **Anonymous-first, optional Google upgrade**
- **Decision:** Users can use the app fully anonymously (Supabase anonymous
  user). At any point they can link a Google account; Supabase preserves
  `auth.uid()` so all their data stays attached.
- **UX rule:** Show an honest, persistent nudge ("Without linking an account
  you cannot recover your data if you clear your browser or switch devices").
  Stronger nudge after first coupon earned / ~1 week of use.
- **Phrasing note:** Do NOT say "data is only on your device" — that's not
  true (data is on Supabase). Say "you cannot recover it without an account."

### 4. Pairing model: **Multiple 1-to-1 relationships per user, ship single-pair UI first**
- **Decision:** Data model supports a user being in many independent 1-to-1
  relationships (e.g. partner + best friend, separate ledgers each). UI ships
  with single-relationship-only first; relationship-switcher unlocked later.
- **Out of scope:** Groups of 3+. The product is intentionally about the
  intimate two-person feedback loop.
- **Schema implication:** A `relationship` row links exactly two users; a
  user can appear in many `relationship` rows.

### 5. Points & coupons mechanics

#### 5a. Points scale
- **Decision:** Fixed scale, **1–5 hearts**.
- **Bonus heart:** a special "10-point bonus" exists, usable **max once per
  week per giver** (per relationship). Rate-limited server-side via
  `last_bonus_at` column + RLS / Postgres function.
- **Bonus visibility:** the bonus mechanic is **hidden / not implemented in
  MVP**. Schema may include the field; UI does not expose it yet.

#### 5b. Coupon economy
- **Decision:** Points are a **spendable currency**. Coupons have prices.
  Claiming a coupon **consumes** points; you must earn them again to claim
  another instance of the same coupon.
- **Variable prices:** coupons can be cheap or expensive; user chooses
  whether to spend on small frequent joys or save for big ones.
- **Hoarding is accepted v1 behavior.** Do not nudge against it.
- **Lifetime totals:** the cumulative total points given/received **is stored
  in the database** (useful for analytics / future features) but
  **not surfaced in the UI**. Goal: prevent score-keeping arguments.
- **Honesty:** never claim "we don't track this" — we do; we just don't show
  a leaderboard.

#### 5c. Backdating points
- **Decision:** Allowed. Each point grant has both `event_date` (when the
  nice thing happened, editable by giver at send time) and `created_at`
  (immutable server timestamp).

#### 5d. Edit / delete after send
- **Comment:** editable for **24 hours** after send. After edit, partner sees
  a persistent "edited" badge. No original-text reveal.
- **Amount:** immutable, always.
- **Delete:** allowed for **5 minutes** after send. **Silent** to partner
  (no notification, no "deleted" marker) — protects against innocent oops
  cases (wrong relationship, typo) without anxiety. After 5 minutes, no
  deletion possible.

#### 5e. Coupon redemption — **two-step escrow flow**
- **Decision:** Two steps separate "commit" from "deliver."
  1. **Claim** (by A, the earner): "I want to redeem coupon X."
     - Points move into **escrow** on A's account (deducted from spendable
       balance, but not yet finalized).
     - B is notified immediately. This gives B prep time (the whole reason
       for two-step — e.g., buying flowers / lingerie / tickets in advance
       of delivering a date-night coupon).
  2. **Deliver** (by B, the giver of the experience): "Done, delivered."
     - Points officially spent; coupon archived to history.
- **B's options on claim:**
  - **Accept & (optionally) schedule** a date.
  - **Propose later** — suggest a different date/time; A confirms.
  - **Decline with reason** — points **fully refunded** to A's spendable
    balance.
- **Timeouts:**
  - After **7 days** with no response from B, A gets a "nudge B" button
    (sends a reminder).
  - After **14 days** with no response, auto-refund + notify both partners.
- **Coupon types (future consideration, not MVP):** for trivially-immediate
  coupons ("make me coffee") the two-step feels silly. Start with always
  two-step. If users complain, introduce an "immediate" coupon flag that
  collapses the two steps into one tap.

#### 5f. Open / deferred
- Whether deliverer or earner can cancel an *accepted-but-not-yet-delivered*
  claim, and what happens to points.
- What happens if a coupon definition is edited or deleted while a claim
  against it is pending.
- Schema for coupon templates per relationship type (still on the queue).

### Not yet discussed
### 6. Coupons — definition, agreement, and templates

#### 6a. Ownership model: per-receiver lists
- **Decision:** Each partner has their own wishlist of coupons **they want to
  receive**. Receiver = the person who experiences the joy. Giver = the
  partner who delivers it.
- A "shared" coupon (e.g., "weekend trip together") is modeled by simply
  adding the same coupon to both partners' lists if both want it. No
  separate "shared list" entity in MVP.

#### 6b. Approval & boundaries
- **Hard rule (gating):** a coupon is `draft` when added; the partner
  (deliverer) must tap **"Yes, I'm in"** before it becomes `approved` and
  claimable.
- **Soft rule (cultural prompt):** when adding a coupon, the UI shows
  guidance text encouraging the couple to **talk about it together**, e.g.
  *"Boundaries can move over time as you both feel more comfortable. What
  feels good? What's a hard no?"*
- **Soft rule (boundaries field):** coupons have an optional **"boundaries
  note"** field for the couple to jot what they agreed (e.g., "30 min max,
  weekdays only," "must be planned 3 days ahead").
- **Retiring:** the deliverer can mark an approved coupon as `retired` at
  any time. Pending claims against a retired coupon are **refunded** to the
  earner (kinder; simpler).

#### 6c. Archetype templates (onboarding helpers)
- **Decision:** Hardcode template suggestions for **three archetypes**:
  - *Getting to know each other* — early dating or new friendship
  - *Established couple* — longer relationship, deeper intimacy options
  - *Close friends* — non-romantic (e.g., "cook dinner together,"
    "video-game night")
- During onboarding (after pairing), the user picks an archetype and gets a
  one-tap "add these to my list" set of starter coupons.
- Templates are **suggestions only**: editable, deletable, mixable across
  archetypes.
- Each suggested template still goes through the **partner-approval flow**
  before becoming claimable. Templates do not bypass approval.
- Tone: keep templates **gentle**. No pushy or culturally narrow defaults.
  Spicier coupons are added by users themselves once they feel ownership.
- Implementation: hardcoded JSON in the repo (no CMS). Localizable.
- **No "family" archetype** — out of scope; product is about partners /
  friends shaping a one-to-one relationship.

#### 6d. Coupon fields
- `id`
- `relationship_id`
- `receiver_user_id` — whose wishlist
- `giver_user_id` — the partner / deliverer
- `title`
- `description` (optional)
- `boundaries_note` (optional, see 6b)
- `price` (points; immutable, see 6e)
- `emoji` / icon (optional, visual flavor)
- `status`: `draft` | `approved` | `retired`
- `created_at`
- `approved_at` (nullable)
- `retired_at` (nullable)
- `template_key` (nullable) — which archetype template it came from, if any
- **Not in MVP:** `cooldown` (min days between redemptions). Hoarding + price
  already self-regulate.

#### 6e. Price is immutable
- **Decision:** Once a coupon is created, **its price cannot change**.
- To change a price, the user **retires the existing coupon and creates a
  new one**, which goes through the partner-approval flow again.
- Pending claims against the old (retired) coupon are refunded per 6b.

### 7. Ping / nudge feature — **DEFERRED, not in MVP**
- **Decision:** Drop from MVP.
- **Rationale:** The whole product premise is the receiver *noticing* and
  appreciating without prompting. A nudge feature inverts that — it asks
  the receiver to notice on demand, which can feel transactional or
  guilt-trippy. We want to keep partners learning to appreciate and to
  **talk outside the app**, not route every interaction through it.
- **Revisit:** if real users request this after launch, reconsider as a
  gentle "FYI / wave" with no points attached, rate-limited, fixed-tone
  presets. Never as a "give me points" request.

### 8. Notifications

#### 8a. Channels in MVP
- **Decision:** In-app feed + **transactional email** (Supabase built-in
  SMTP). **No web push, no PWA install flow** in MVP — defer until users
  request.
- Rationale: keeps tech setup minimal; web push (especially iOS PWA
  requirement) is a rabbit hole for a side project.

#### 8b. Email events in MVP

**Hearts (appreciation) — throttled curiosity nudge:**
- **At most 1 email per day per receiver**, only on days they actually
  received at least one heart since the last email sent.
- **No count, no comment preview.** Subject neutral (e.g., *"Bob
  appreciated you"* / *"You got some love today 💚"*). Body: one line +
  "Open the app to see" button.
- Goal: curiosity pulls them into the app to read comments — supports the
  ritual without spamming.
- Implementation: track `last_heart_email_at` per (relationship, receiver);
  daily cron / Edge Function checks for new hearts since that timestamp.
- **User-toggleable** in settings (default: on).

**Coupon-flow emails (immediate, time-sensitive):**
- **Coupon claimed (escrow)** → deliverer notified ("Alice wants to redeem X
  — get ready")
- **Claim accepted / scheduled** → claimer notified
- **Claim declined** → claimer notified (mention refund)
- **Claim auto-refunded after 14 days** → both notified
- **Nudge** (claimer presses "nudge" button after 7 days of no response)
  → deliverer gets the same content as the original claim email
- All user-toggleable; default on.

**No email in MVP for:**
- Coupon added to wishlist (couples should talk about these in person; can
  add later)
- Comments alone (rolled into the daily hearts email)
- Coupon delivered (claimer was there for the experience; in-app history
  is enough)
- Coupon retired

#### 8c. Email service
- **Decision:** Supabase built-in SMTP for MVP. Acceptable for low volume.
- Swap to Resend / Postmark only if deliverability becomes an issue.

#### 8d. Acknowledged risk
- With no push and only minimal email, the **less-engaged partner may drift
  out of the loop**. Acceptable MVP risk. Likely v1.1 fix: weekly
  opt-in digest. Wait for real-user signal before building.

### 9. Realtime / data freshness — **polling, not Realtime, in MVP**

#### 9a. Refresh strategy
- **Decision:** **Refresh on tab focus + on user action + manual refresh
  button.** No interval polling, no Supabase Realtime in MVP.
- Rationale:
  - Cheapest on free-tier quotas (egress + Realtime concurrent connections).
  - Realistic usage: open app, do a thing, close. Users rarely sit
    passively in the app.
  - User's own actions feel instant (response from the write refreshes
    the relevant store).
  - Tab focus covers the "I came back to check" case.
  - Manual refresh button is the escape hatch for the rare both-online
    moment.

#### 9b. Realtime deferred
- **Decision:** Supabase Realtime explicitly **deferred**.
- Revisit when there's user signal that partners sit in the app together
  for stretches (e.g., reading hearts on a date). Then a single
  per-relationship channel can be added without restructuring data
  fetching — the polling layer remains as fallback.

#### 9c. Implementation note
- Build data access as a thin store/cache that exposes `refresh()`. Realtime
  later just calls the same `refresh()` (or patches the store) on row
  events. This keeps the upgrade path trivial.

### 10. Multi-device for the same user

- **Decision:** Multi-device requires **linking a real account** (Google in
  MVP). Anonymous users are **single-device** by design.
- **UI framing (positive):** in onboarding and settings, show *"Want to use
  this on another device? Link your Google account to sync."* — positions
  account linking as an unlocking feature, not a barrier.
- **Consistency:** matches Q3 (anonymous-first, optional Google upgrade)
  and Q3's data-loss warning.
- **Out of scope:** building a custom anonymous-user transfer-code /
  device-handoff flow. Bad complexity-to-value ratio.
- **Note:** pairing two anonymous users on different devices (the QR pair
  flow) is a separate concern and works fine — pairing is between *users*,
  not devices.

### 11. SEO / SSG split — routing structure

#### 11a. Routes
```
/               → SSG  (homepage; includes "How it works" section)
/privacy        → SSG  (required for Google OAuth approval)
/terms          → SSG  (required when offering Google login)
/pair/:code     → SSG shell, dynamic content fetched client-side
/app/*          → SPA  (single prerendered shell, client-side routing)
    /app                → dashboard
    /app/wishlist       → manage own wishlist + see partner's
    /app/coupons        → claims (active + history)
    /app/settings       → account, link Google, notifications, etc.
```

#### 11b. `/app/*` on GitHub Pages
- **Decision:** Prerender `/app` as a **single shell HTML**; all `/app/*`
  sub-routes are client-side routing within that shell.
- **Deep-link handling on GH Pages:** use the standard 404.html fallback
  trick (GH Pages serves `404.html` for any unmatched path; we set that to
  the app shell, which then reads the URL and renders the right view).
- Alternative: configure `app.config.ts` prerender so each `/app/*`
  sub-route emits the same shell HTML — cleaner than 404 trick. Decide at
  implementation time; both work.

#### 11c. "How it works" content
- **Decision:** **Section on `/`**, not a separate route, for MVP.
- One strong SEO page beats two weak ones. Promote to a separate route
  later if content grows.

#### 11d. Required content before public launch
- `/privacy` — must exist before Google OAuth client approval. Even minimal.
- `/terms` — same.
- These two are blockers for enabling Google login in production.

### 12. Privacy, encryption, GDPR, i18n, theme

#### 12a. End-to-end encryption of comments
- **Decision:** **Real E2E encryption of comment text only.** Coupons,
  hearts, amounts, timestamps, IDs, and totals stay plaintext (queryable).
- **Algorithm:** AES-GCM (256-bit) via WebCrypto API, no library needed.
- **Per-relationship key:**
  - Generated client-side at pair time on the initiating device.
  - Embedded in the QR code alongside the pair code.
  - Stored locally in IndexedDB on each paired device.
  - **Never sent to Supabase in plaintext.**
- **What's encrypted:** `points.comment` only.
- **What's not encrypted:** coupon titles, descriptions, boundaries notes,
  hearts amounts, dates, IDs, lifetime totals.
- **Rationale for not encrypting coupons:** they're chosen jointly with the
  partner (typically tame), and the app needs to display, sort, filter
  them — making encrypted coupons work is messy for low value.
- **Honest framing:** "obfuscation with a key we can derive" is NOT
  encryption. We do real E2E or none.

#### 12b. Key recovery — password-wrapped key blob
- **Decision:** **Recovery enabled via user-set password.** Applies to
  both anonymous and logged-in users — login does NOT help with key
  recovery (the key was never on the server).
- **Flow:**
  - At pair time, after key generation, prompt: *"Set a recovery password.
    You'll need this if you ever switch browsers or lose this device."*
  - Client derives a wrapping key from the password (PBKDF2 or Argon2,
    with a per-relationship salt).
  - Wraps the relationship key with the wrapping key. Stores
    `wrapped_key_blob`, `wrap_salt`, `wrap_iterations`, `wrap_algo` on
    the `relationship` row in Supabase.
  - On new device: log in (or re-pair) → fetch wrapped blob → enter
    password → unwrap → key restored.
- **Properties:**
  - Password never leaves the client.
  - Server only sees the wrapped blob (useless without password).
  - Forgotten password = old comments unreadable forever (honest, no
    backdoor).
  - Settings has a "change recovery password" flow (re-wraps with new
    password).
- **Rationale:** standard pattern (1Password, Signal PIN, Bitwarden).
  Without this, even logged-in users lose comments on device loss /
  IndexedDB eviction. The cost is ~half a day and one extra column group
  on `relationship`.

#### 12c. Comment length
- **Decision:** soft cap **200 characters**. Nudges toward brief
  appreciation rather than long diary entries (also limits blast radius
  if E2E ever fails).

#### 12d. GDPR — MVP must-haves
All non-optional; ship with MVP:
- **Privacy policy page** (`/privacy`) — what data, why, retention,
  Supabase as processor, user rights, controller contact.
- **Terms page** (`/terms`).
- **Account delete** in settings — cascades to wipe personal data.
- **Data export** in settings — JSON download. **Comments decrypted
  client-side** in the export to be useful.
- **Supabase project in EU region** (Frankfurt or Ireland).
  - **Confirmed 2026-06-01:** the connected Supabase project is in
    region **`eu-central-1` (Frankfurt)** ✓ — meets the EU
    requirement.
- **Sign Supabase DPA** before going live.
- **Breach notification process** — 72h to notify users + supervisory
  authority if a breach occurs.

#### 12e. Internationalization
- **Decision:** **English + Polish + German** at MVP.
- **Quality control:** project owner verifies German personally.
- **Architecture:**
  - All strings via translation function. No hardcoded copy in components.
  - Locale switcher in UI; locale persisted in `localStorage` and (for
    logged-in users) on a `user_settings` row.
  - **CSS uses logical properties** (`margin-inline-start`,
    `padding-block`, etc.) — RTL-ready from day one even though no RTL
    language ships in MVP.
  - String files: JSON per locale (`src/locales/en.json`, `pl.json`,
    `de.json`).
  - Date/number formatting: `Intl.*` APIs.
  - Pluralization: ICU-style. Polish has 4 plural forms; test early.
- **Library:** `@solid-primitives/i18n` (lightweight, official Solid
  primitive, no SSR headaches).
- Adding more languages later = drop a JSON file in.

#### 12f. Dark theme
- **Decision:** three modes — **light / dark / system**, defaulting to
  **system preference**.
- **Implementation pattern:**
  - CSS custom properties on `:root` for color tokens.
  - `[data-theme="dark"]` selector overrides them.
  - Inline script in `entry-server.tsx` reads `localStorage("theme")`
    *before paint* to prevent flash.
  - `prefers-color-scheme` media query handles "system."
  - Toggle UI in app header / settings.

### 14. Branding & app name — **DEFERRED**

**Status:** name not chosen yet. Top candidate "Kindling" rejected (existing
dating app — too close in product space). Owner will revisit; branding
depends on the chosen name.

#### 14a. Direction chosen
- **Direction E: metaphorical object / single-noun.** Picked over invented
  word, compound, foreign, or punny.
- Product thesis: *gentle appreciation, small tokens of care, warmth between
  partners.* Avoid gamified-sounding names ("Score", "Quest", "Battle")
  and avoid cute/cringe names.

#### 14b. Constraints to honor when picking
1. Pronounceable in EN / PL / DE; not embarrassing in any of them.
2. Domain available — `.app` is acceptable; do NOT chase `.com` (single-noun
   `.com`s are universally taken). `.app` requires HTTPS, signals "app",
   widely recognized.
3. No collision with an existing app **in our product space** (couples /
   relationships / dating). Kindling failed exactly this check.
4. Short, easy to type, easy to mention out loud.
5. Not too on-the-nose about gamification / points / coupons (the metaphor
   should be warmth, care, or small-things-collected — not scoreboards).
6. Searchable: type the name into Google — does it land on something
   confusing or embarrassing?

#### 14c. Candidate shortlist (already brainstormed)

Reject any with collisions in couples/dating space. Verify the rest.

| Name | Metaphor | Notable risks |
|---|---|---|
| ~~Kindling~~ | small things keep the fire | **Existing dating app — REJECTED** |
| Hearth | warm center of shared home | Fintech "Hearth" exists (home loans, different category) |
| Petal | soft small thing; flower of small kindnesses | Common word, many products |
| Ember | warmth kept alive | Popular JS framework "Ember.js" — collision risk for devs |
| Lantern | light you give each other | Several apps (VPN, others) |
| Bouquet | collection of beautiful gifts | Spelling friction for non-French-speakers |
| Posy | small collected bouquet (old-fashioned) | Obscure word; mispronounceable |
| Marigold | warm flower; affection in many cultures | Several marketing-platform "Marigold" companies |
| Pinecone | small thing collected on walks together | "Pinecone" is a vector DB |
| Acorn | small thing that grows | Acorn UK bank |
| Clover | small lucky find | Generic; many uses |

Owner can also explore additional directions if E doesn't pan out:
- **A: invented 2-syllable word** (Notion-style) — most distinctive
  long-term, hardest to evoke meaning at first
- **C: foreign-language word** (e.g. PL *Bliskość*, DE *Liebevoll*,
  Spanish *Cariño*, JP *Kigai*) — emotionally rich but adds friction

#### 14d. How to check availability — full checklist

For each candidate, run all four checks. Don't skip any.

**1. Domain availability**
- Primary registrar to check: **Porkbun** (`porkbun.com`) or **Namecheap**
  (`namecheap.com`). Both show available TLDs at a glance.
- TLDs to check, in priority order:
  1. `.app` — recommended primary
  2. `.love` — niche but fits the product
  3. `.cc` / `.io` — fallbacks
  4. `get<name>.app`, `<name>hq.app`, `<name>club.app`,
     `we<name>.app`, `our<name>.app` — compound fallbacks if the bare
     name is taken

**2. Trademark search (free, official)**
- **EU (covers PL + DE markets):**
  [`euipo.europa.eu/eSearch`](https://euipo.europa.eu/eSearch/) — search
  text mark in classes **9** (software) and **42** (SaaS / hosted
  software). Look for active registrations, not abandoned ones.
- **US:** [`tmsearch.uspto.gov`](https://tmsearch.uspto.gov/) — same
  classes. Use TESS basic word-mark search.
- **WIPO global brand database** (cross-checks many countries at once):
  [`branddb.wipo.int`](https://branddb.wipo.int/branddb/en/).
- **Heuristic:** identical mark in same class = blocker. Similar mark in
  same class = grey area, consider renaming. Identical mark in unrelated
  class (e.g. clothing brand) = usually fine.

**3. Existing-app collision check**
- Google: `"<name> app"`, `"<name>" couples`, `"<name>" relationship`,
  `"<name>" dating`. Any hit on a couples/dating/wellness app is a
  blocker (this is what killed Kindling).
- App stores: search both **Apple App Store** and **Google Play** —
  even though we're a web app, the same name on a mobile dating app is
  problematic for SEO and brand confusion.
- Product Hunt: `producthunt.com/search?q=<name>` — surfaces small new
  apps trademark searches won't catch.

**4. Linguistic sanity (EN / PL / DE)**
- Read it out loud in each language. Ask a native PL and DE speaker.
- Look it up in each language on Wiktionary — sometimes a benign English
  word is a slur or vulgar in another language (the classic "Mist" =
  fog/dung problem).
- Also test: does the name sound similar to any negative word in those
  languages?

**5. Social handle availability** (nice-to-have, not blocker)
- Check `twitter.com/<name>`, `instagram.com/<name>`,
  `github.com/<name>`. Side-project owners can usually live with handle
  variants like `<name>app` if the bare handle is taken.

#### 14e. Once a name is chosen, return to branding
The name unlocks: visual identity (logo metaphor flows from a
single-noun name), color palette, copy voice (warm vs. playful vs.
serious), domain registration, OAuth client display name, README, social
copy, etc. **All deferred until name is locked.**

#### 14f. Session 2 — exploration shifted away from single-noun

Owner reported that single-noun (.app) availability and trademark collisions
in §14c make Direction E impractical in 2026 — most warm single nouns are
taken in some category that creates SEO or brand risk. Direction E remains
the **fallback ideal** but is no longer the primary search.

**New directions explored:**

1. **Phrase → acronym pattern** (BMW / IKEA / TED style). Phrase carries
   meaning, acronym becomes the brand.
2. **Two-word evocative compound** (Day One / Big Sur / Hello Fresh style).
   Sidesteps single-noun trademark scarcity without needing explanation.

**Candidates discussed:**

- **"Long Term Performance" → `ltp` / `lp9`** (mirrored-P glyph as logo).
  - Owner's case for keeping it: "performance" here refers to the
    *relationship's* performance, not individual benchmarking. Acronym
    is corporate enough that it stays in corporate heads; the warm
    brand can reclaim it.
  - Counter-case (assistant's grilling): conflicts with the product
    principle that the app is **not** a score/measure/optimize tool
    (see HANDOFF.md "Don't poison the game", DESIGN §5b hidden lifetime
    totals). "Performance" reframes the loop as something to optimize.
    Risk: undermines the warm tone on the homepage. Also: `lp9` mixes
    letter+digit, which usually reads as cheap/license-plate unless
    iconic. Also: requires constant explanation ("LP-nine, the 9 is a
    mirrored P").
  - **Status:** owner defends, decision deferred. Revisit alongside
    other candidates with fresh eyes.

- **"What You Give Is What You Get" → WYGIWYG / WIGIWIG.**
  - Rejected by assistant on three grounds: (1) the phrase *literally*
    describes karmic transactionalism, contradicting the product's
    "give because you noticed, not to get back" principle;
    (2) WYSIWYG collision is unavoidable; (3) acronym is unpronounceable.
  - **Status:** owner did not push back; consider this direction closed.

**Mirroring as visual identity — KEEP regardless of name.**

The mirror motif (reciprocity, partner reflection, give↔receive symmetry)
is a strong **brand/visual** idea independent of the name. Logos with
mirror symmetry work for almost any warm noun or short acronym. Decision:
once a name is picked, the mark explores a mirrored / symmetric form.

#### 14g. Two-word candidates seeded (not yet evaluated against §14d checklist)

Capturing the brainstorm so it's not lost. None of these are chosen.
Owner to react / extend / reject in a later session.

| Name | Reading |
|---|---|
| Soft Tally | gentle scorekeeping; "tally" already has mirror-mark feel |
| Two Hearths | two homes, two warmths; mirroring built in |
| Kind Ledger | honest about the mechanics, "kind" warms it |
| Daily Bouquet | small things collected each day |
| Quiet Credit | appreciation as currency, but quiet |
| Slow Glow | warmth that builds over time |

Acronym-pattern candidates that *might* survive scrutiny (also unverified):

| Phrase | Shortcut | Notes |
|---|---|---|
| "Thanks I Never Said" | TINS | reads as "tins" — mirror-friendly? Collision check unverified |
| "Little Things, Often" | LTO | LTO = "limited time offer" — collision risk |
| "You and I" | Y&I | natural symmetry; very generic, SEO-hostile |

#### 14h. Working principle going forward

A good name for this product **does not fight the product**. The product
is about *noticing without expecting*, *warmth without measurement*,
*reciprocity without bookkeeping*. The name should not introduce
"performance", "score", "exchange", "tally" (despite the entry above —
might be too on-the-nose), or "karma" framing even by implication.

Reject any candidate that, read by a fresh user on the homepage, would
suggest the app is about optimizing, comparing, or earning.

#### 14i. Status & decision
- **Name: NOT CHOSEN.** Deferred again.
- **Approach:** move on to technical implementation (Phase 0 of HANDOFF).
  Names sometimes clarify themselves once the product takes physical
  shape. Revisit branding when (a) owner has a strong candidate to
  evaluate, or (b) we approach Phase 9 (homepage) where a name is
  finally a blocker.
- **Until a name is chosen:** the repo / project remains generically
  named ("coupons"); placeholders in code/copy use `APP_NAME` constant
  so a global rename is trivial later.

### 13. Data model

> Shape locked in at design phase. Exact column names, indexes, and RPC
> signatures are refined when writing the actual SQL migration.

#### 13a. Tables

**`profiles`** — extends Supabase `auth.users` (1:1 by id).
- `id` uuid PK, FK → `auth.users.id`
- `display_name` text, nullable (shown to partner)
- `locale` text — `'en'` | `'pl'` | `'de'`
- `theme` text — `'light'` | `'dark'` | `'system'`, default `'system'`
- `created_at` timestamptz
- Auto-created via trigger on `auth.users` insert.

**`relationships`** — exactly two members. **Created only post-pairing**
(no `pending` state; the pairing_invites row carries the pre-pair state).
- `id` uuid PK
- `member_a` uuid FK → profiles.id (NOT NULL)
- `member_b` uuid FK → profiles.id (NOT NULL post-pairing)
- `archetype` text — `'getting_to_know'` | `'established_couple'` |
  `'close_friends'`
- `status` text — `'active'` | `'archived'`
- `created_at` timestamptz
- `paired_at` timestamptz
- Encryption recovery (Q12b):
  - `wrapped_key_blob` bytea (nullable until recovery password set)
  - `wrap_salt` bytea
  - `wrap_iterations` int
  - `wrap_algo` text — e.g. `'PBKDF2-SHA256'`
- Constraints:
  - `CHECK (member_a <> member_b)`
  - `UNIQUE (LEAST(member_a, member_b), GREATEST(member_a, member_b))`

**`pairing_invites`** — short-lived QR pairing rows.
- `id` uuid PK
- `code` text UNIQUE (short opaque code in QR, e.g. 8 chars)
- `created_by` uuid FK → profiles.id
- `archetype` text (selected by inviter; will become the relationship's
  archetype on redemption)
- `expires_at` timestamptz, default `now() + interval '24 hours'`
- `consumed_at` timestamptz nullable
- The encryption key is **NOT** stored here — it lives in the QR alongside
  the code, never on the server.
- On redemption: an RPC creates the `relationships` row with both members
  and marks the invite consumed.

**`coupons`** — wishlist items per receiver.
- `id` uuid PK
- `relationship_id` uuid FK → relationships.id
- `receiver_id` uuid FK → profiles.id (must be a member)
- `giver_id` uuid FK → profiles.id (the other member)
- `title` text
- `description` text nullable
- `boundaries_note` text nullable (Q6b)
- `emoji` text nullable
- `price` int CHECK (`price > 0`) — **immutable** (Q6e)
- `status` text — `'draft'` | `'approved'` | `'retired'`
- `template_key` text nullable (which archetype template it came from)
- `created_at`, `approved_at`, `retired_at` timestamptz

**`coupon_claims`** — escrow flow (Q5e).
- `id` uuid PK
- `coupon_id` uuid FK → coupons.id
- `relationship_id` uuid FK → relationships.id (denormalized for RLS)
- `claimer_id` uuid FK → profiles.id (= coupon.receiver_id at claim time)
- `deliverer_id` uuid FK → profiles.id (= coupon.giver_id at claim time)
- `price_at_claim` int (frozen so retiring/renaming a coupon doesn't
  change history)
- `status` text — `'pending'` | `'accepted'` | `'declined'` |
  `'delivered'` | `'auto_refunded'`
- `scheduled_for` timestamptz nullable
- `decline_reason` text nullable
- `claimed_at`, `accepted_at`, `declined_at`, `delivered_at`,
  `nudged_at` timestamptz (last four nullable)

**`points`** — heart events.
- `id` uuid PK
- `relationship_id` uuid FK → relationships.id
- `giver_id` uuid FK → profiles.id
- `receiver_id` uuid FK → profiles.id
- `amount` int CHECK (`amount BETWEEN 1 AND 5`) — bonus heart deferred,
  add column when feature ships
- `comment_ciphertext` bytea nullable (E2E encrypted, Q12a)
- `comment_iv` bytea nullable (per-message AES-GCM IV)
- `edited_at` timestamptz nullable
- `event_date` date (backdating allowed, Q5c)
- `created_at` timestamptz
- `deleted_at` timestamptz nullable (soft delete inside 5-min window;
  rows past the window cannot be deleted)

**`user_settings`** — per-user toggles.
- `user_id` uuid PK FK → profiles.id
- `email_hearts_daily` bool default true (Q8 throttled curiosity nudge)
- `email_coupon_claimed` bool default true
- `email_coupon_decision` bool default true (accept/decline/scheduled)
- `email_coupon_auto_refund` bool default true
- `last_hearts_email_at` timestamptz nullable (throttle bookkeeping)

#### 13b. Computed values, not stored

- **Spendable balance** for user X in relationship R is computed:
  - `total_received` = SUM(amount) WHERE receiver = X, deleted_at IS NULL
  - `escrowed` = SUM(price_at_claim) of X's `pending`/`accepted` claims
  - `spent` = SUM(price_at_claim) of X's `delivered` claims
  - `spendable = total_received − escrowed − spent`
- **Lifetime totals** (Q5b: stored conceptually, hidden from UI) =
  computed from `points` on demand. **No denormalized totals table** in
  MVP. Add one only if measured query performance demands it.

#### 13c. RLS (Row Level Security)

All tables have RLS enabled. Helper function:
```sql
CREATE FUNCTION is_relationship_member(rel_id uuid)
RETURNS bool LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM relationships
    WHERE id = rel_id
      AND (member_a = auth.uid() OR member_b = auth.uid())
  );
$$;
```

Per-table policies (sketch):
- **profiles:** SELECT own row or rows of relationship co-members; UPDATE
  own only; INSERT own (via trigger).
- **relationships:** SELECT/UPDATE only if member; INSERT only via RPC
  (`redeem_pair_code`).
- **pairing_invites:** SELECT creator only; redemption goes through
  RPC (`redeem_pair_code(code)`) with `SECURITY DEFINER` to find the
  invite without leaking via RLS.
- **coupons:** all ops gated by `is_relationship_member(relationship_id)`;
  status transitions (draft→approved, approved→retired) restricted to
  the appropriate member via RPC.
- **coupon_claims:** all ops gated by `is_relationship_member`; all state
  transitions go through RPCs.
- **points:** SELECT gated by `is_relationship_member`; INSERT requires
  `giver_id = auth.uid()`; comment edits / deletes go through RPCs that
  enforce the time windows.
- **user_settings:** SELECT/UPDATE own only.

#### 13d. RPCs (Postgres functions, called from client)

Business logic stays server-side; clients call RPCs rather than raw
inserts/updates for state-changing actions.

- `redeem_pair_code(code text)` — creates relationship, marks invite consumed.
- `give_points(receiver, amount, comment_ciphertext, comment_iv, event_date)` — wraps insert with validation.
- `edit_point_comment(point_id, ciphertext, iv)` — enforces 24h window, sets `edited_at`.
- `delete_point(point_id)` — enforces 5-min window, sets `deleted_at`.
- `submit_coupon(...)` — insert as `draft`.
- `approve_coupon(coupon_id)` — only by giver.
- `retire_coupon(coupon_id)` — only by giver; refunds pending claims.
- `claim_coupon(coupon_id)` — escrow, validates spendable balance.
- `accept_claim(claim_id, scheduled_for?)` — deliverer only.
- `decline_claim(claim_id, reason)` — deliverer only; refunds.
- `deliver_claim(claim_id)` — deliverer only; finalizes spend.
- `nudge_claim(claim_id)` — claimer only; rate-limited (>= 24h between
  nudges, only after 7 days from claim).
- `set_recovery_password(rel_id, wrapped_blob, salt, iterations, algo)` — first set + change.

A scheduled job (Supabase Edge Function or pg_cron) runs daily to:
- Auto-refund claims older than 14 days (`auto_refunded`).
- Send the throttled hearts email per Q8.

#### 13e. Indexes (sketch)
- `points (relationship_id, created_at DESC)` — feed queries
- `points (receiver_id, created_at DESC)` — hearts-to-me queries
- `coupons (relationship_id, status)` — wishlist queries
- `coupon_claims (relationship_id, status)` — active claims
- `coupon_claims (deliverer_id, status)` — "things waiting on me"
- `pairing_invites (code)` UNIQUE
- `relationships (LEAST(member_a, member_b), GREATEST(member_a, member_b))` UNIQUE

#### 13f. Design notes
- `relationship_id` is denormalized onto child tables (coupons, claims,
  points) on purpose — keeps RLS predicates a single index lookup with no
  joins. Standard pattern for Supabase.
- `coupon_claims.price_at_claim` freezes price so retiring/recreating a
  coupon (Q6e) cannot change historical spend.
- No audit log in MVP — the data itself is the audit log for a 2-person
  app.
- No activity-feed table — dashboard feed is computed at read time
  (UNION of recent points + claim state changes).
- Soft delete (`deleted_at`) on `points` only; on account deletion (GDPR,
  Q12d) we hard-delete cascade.

## Tech stack (locked in)

- **Framework:** SolidJS + SolidStart + Vinxi
- **Build:** Static site generation where possible (SEO homepage), SPA for
  authenticated app area
- **Package manager:** pnpm
- **Hosting:** GitHub Pages with `BASE_PATH` env-var handling
  (build-time prefix for asset URLs; needed when GH Pages serves the
  site from a sub-path like `/lp9-beta/`)
- **Backend:** Supabase
- **Styling:** TBD — pick at PRD-10 / PRD-08 execution time
- **TypeScript:** strict

### 15. Privacy mode (shoulder-surfing protection)

**Threat model:** someone glances at the user's phone, or the user wants to
show the app to a friend without exposing intimate content. Not a
cryptographic protection — it's a UI veil.

#### 15a. What "private mode" hides
- **Comments on hearts** — blanket rule, every comment is hidden in private
  mode (no per-comment flag).
- **Coupons flagged private by this device's owner** — see §15b.
- **What stays visible:** hearts amounts and dates, spendable balance,
  non-private coupons, claim-flow structure (so the app remains usable
  during private mode).

#### 15b. Per-coupon private flag
- **Per-user, per-device-local.** Each user independently flags coupons as
  private on their own device. The flag is **not** shared with the partner
  and does **not** sync across that user's own devices (MVP).
- A user marking coupon X private affects only their view. The partner
  viewing the same coupon X sees it normally unless they also flag it
  private on their device.
- **Storage:** `localStorage` (not IndexedDB, not server). Chosen for size
  (just a `Set<coupon_id>`), synchronous API, easy debugging. Server-side
  sync can be added post-MVP if users complain.
- **Library:** `@solid-primitives/storage` `makePersisted` to wrap a Solid
  signal/store. Components subscribe to the signal; storage is a side
  effect. This gives us reactive cross-component updates that neither
  raw localStorage (no same-tab event) nor IndexedDB (no events) provides
  natively.

#### 15c. Toggle behavior
- **Default ON at every app launch.** Private mode resets to "on" each
  time the app opens. Sticky-off would defeat the threat model
  (someone glances at the phone you just unlocked).
- **In-session persistence:** within a single session the toggle is
  sticky — turning it off stays off until close/reload.
- **No PIN, no biometric, no auto-re-hide timer in MVP.** Simple eye-icon
  toggle in the app header. Can layer stricter protections later if
  users ask.

#### 15d. UI for hidden items
- **Hidden coupons:** shown as a **locked placeholder row** with explicit
  text indicating the item is hidden (e.g., "🔒 Hidden coupon — turn off
  private mode to view"). Preserves list count and signals to the owner
  that more exists.
- **Hidden comments:** heart row shows amount + date + a placeholder
  (e.g., "💬 Comment hidden in private mode"). Same principle as coupons.
- **Rationale:** the owner needs to know what's there; the shoulder-surfer
  learns only "something private exists," not what it is.

#### 15e. Emails and notifications
- **No change required.** Per §8b, emails already never reveal content
  (no comment previews, no coupon titles in subject lines). Private mode
  is purely an in-app veil.
- **In-app notifications:** if/when we add them post-MVP, must respect the
  same content-free rule.

#### 15f. Out of scope for MVP
- Server-side sync of private flags across a user's devices.
- PIN / biometric gate on revealing.
- Per-comment private flag (blanket rule is simpler and consistent).
- Auto-re-hide after inactivity.
- "Decoy" mode (showing fake content) — explicitly not building this.

#### 15g. Schema impact
- **None.** Private flags live in `localStorage`. No new tables, columns,
  or RPCs in MVP.

### 16. Process & tooling

This section captures **how** we build, not what we build. Decisions
about repo layout, agent roles, tracking, Supabase access, git hosting,
and secret hygiene.

#### 16a. Slicing strategy — vertical from Phase 3 onward

- **Phases 0–2** (repo bootstrap, Supabase + auth, pairing + encryption)
  are kept as **horizontal foundation**. They are unavoidable
  infrastructure with no meaningful user-visible behavior until they're
  all in place. Splitting them vertically just shuffles plumbing.
- **From Phase 3 onward**, work is strictly **vertical**: each PRD
  delivers one user-visible behavior end-to-end (schema migration → RLS
  → RPC → data-access layer → UI → tests → verification).
- **Why:** keeps every merge demoable, surfaces design gaps early
  (instead of after a server layer is "done"), keeps agents' context
  small and focused.

#### 16b. PRD granularity — tiny

- Each PRD is **as small as is coherent**. Target: an agent can hold the
  whole PRD + the files it touches in working context without
  summarization.
- Required sections in every PRD: **Goal**, **Scope (in / out)**,
  **Touched files / new files**, **Data model impact** (schema /
  migration / RPC), **UI behavior**, **Verification** (concrete
  steps QA executes), **Open questions**.
- **Ambiguity rule:** if the Dev agent encounters anything the PRD does
  not unambiguously cover, it MUST stop and invoke the **`grill-me`**
  skill rather than guess. Guessing pollutes the design history.
- Naming: `prds/PRD-NN-short-slug.md`, numbered globally (not per phase)
  so order of execution is explicit.

#### 16c. Agent roles — Dev / QA / Orchestrator

Implemented as opencode subagents in `.opencode/agent/`:

- **Dev agent** (`.opencode/agent/dev.md`):
  - Reads: the PRD + files it lists + `DESIGN.md` + `PROGRESS.md`.
  - Produces: code changes + **unit tests** for the feature + a
    self-test note in the PRD.
  - **Does NOT** mark the PRD complete. Does NOT touch unrelated files.
  - Tools: full edit/read/bash within the repo; no network beyond pnpm
    + Supabase CLI against the **dev** project only.
- **QA agent** (`.opencode/agent/qa.md`):
  - Reads: the PRD + the Dev agent's diff + `DESIGN.md` + the affected
    code.
  - Produces: **end-to-end and adversarial tests** (RLS bypass attempts,
    time-window edge cases, race conditions, GDPR delete-cascade
    correctness, encryption boundaries). Runs them. Reports pass/fail
    with reproduction steps.
  - **Read-only on code.** May write tests under `tests/qa/` and write
    findings into the PRD under a `## QA findings` section.
  - Tools: read + bash (tests, supabase CLI against the local
    `supabase start` stack or a Supabase preview branch URL — never
    against prod); no edit on `src/`.
- **Orchestrator** = the human-facing chat session. Decides when to
  invoke Dev vs QA on a given PRD, merges findings, signs off, updates
  `PROGRESS.md`.

**Test split rationale:** Dev tests prove "the happy path I wrote
works." QA tests prove "the things I wasn't thinking about don't
break." These are different muscles and benefit from separation; QA
agent starts cold from the PRD, not from the implementation choices.

#### 16d. Progress tracking — single `PROGRESS.md` at root

- One file: `PROGRESS.md` at repo root. Rows = PRDs. Columns: PRD #,
  title, phase, status, links.
- States: `todo` → `in-progress` → `dev-done` → `qa-done` → `merged`.
- PRD files themselves stay at stable paths (`prds/PRD-NN-slug.md`) —
  no folder moves on status change. Cleaner git history; status lives
  in `PROGRESS.md` only.

#### 16e. Supabase access model — single project + GitHub branching

- **One Supabase project**, connected to the GitHub repo via Supabase's
  **GitHub Integration** (Project Settings → Integrations → GitHub).
  - Working directory: `.` (the `supabase/` folder lives at repo root).
  - **Automatic branching: ON.** When a git branch is created in the
    connected repo, Supabase auto-creates a matching ephemeral
    "preview branch" — an isolated Supabase environment with its own
    DB, isolated migrations, and no production data.
  - **Deploy to production: ON.** Pushes/merges to the production
    branch (`master`) cause Supabase to apply new migrations to the
    real production DB.
- **Why one project, not two:** Supabase's branching is the
  isolation mechanism. A second separate Supabase project would
  duplicate config, require its own GitHub integration, and defeat
  the purpose. Branching gives us per-PRD isolation for free.
- **Schema work goes via SQL migration files** in
  `supabase/migrations/NNNN_short_name.sql`. Never click-ops in the
  Supabase dashboard for schema changes.
- **No local Supabase access tokens or DB passwords needed.**
  Migrations run inside Supabase's CI runners, authenticated via the
  GitHub integration, not via my local credentials. The local
  `supabase` CLI is still useful for **scaffolding migrations
  (`supabase migration new`), formatting, and local testing**, but it
  does NOT need a personal access token or DB password for the
  branch-driven flow.
- **Anon key + project URL** still ship in the browser bundle (they
  must — they're the public client credentials). They are surfaced
  via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars,
  documented in `.env.example`. Not secret, but kept out of the
  source per §16g hygiene.
- **Required-check (§16e.1):** the Supabase Preview check is
  configured as a **GitHub branch protection required check** on
  `master` so a PR with a broken migration cannot merge to prod.
- **No migration is considered ready** until: (a) the Supabase
  preview branch CI check goes green on the PR, AND (b) QA has
  verified the user-visible behavior on the preview environment.
- **Implication for §16e (older draft):** the prior plan to maintain a
  separate `dev` project I pushed to manually with a personal access
  token is **superseded by this section**. Decision recorded
  2026-06-01.

#### 16f. Git hosting — single GitHub repo, branching for environments

- **One GitHub repo** (currently `dumbNickname/lp9-beta`; will be
  renamed when the final app name is locked per §14i).
  - Public, AGPL-licensed (see §17).
  - **Default `git push` target** = this repo. No other remote in the
    plan (the previously planned separate `prod` repo is dropped per
    §16e: Supabase branching gives us dev/prod isolation; a second
    repo would duplicate config without adding isolation).
- **Branching model — Supabase-recommended pattern:**
  - **`master` = production.** Code on `master` is what's deployed
    publicly; migrations on `master` are applied to the prod
    Supabase DB. Protected: PRs only, with required checks.
  - **Feature branches = previews.** For each PRD that touches code
    or schema, create `feat/PRD-NN-slug` (or similar). Pushing the
    branch auto-creates a Supabase preview environment for it. Open
    a PR; QA verifies on the preview; merge to `master`; delete the
    branch.
  - **No permanent `develop` branch in MVP.** Owner explicitly
    chose this in the same session that locked branching. Revisit
    only if friendly-tester feedback shows demand for a stable
    non-prod URL.
- **Branch protection on `master`:**
  - Require PR (no direct pushes).
  - Require Supabase Preview check to pass (§16e.1).
  - Require gitleaks CI check to pass (added by PRD-09 deploy
    workflow).
  - Linear history (squash merges) to keep `master` history clean.
- **Why one repo:** Supabase's GitHub integration is **branch-aware,
  not repo-aware**. A second repo would either need its own Supabase
  project (duplicating §16e) or would have no Supabase coverage at
  all (defeating the reason for the split). The two-repo
  default-push-to-beta pattern works fine for static sites with no
  shared backend state, but it's the wrong pattern for a
  Supabase-backed app.
- **Renaming later:** when the final name is chosen (§14i), the
  GitHub repo gets renamed via the dashboard. The Supabase GitHub
  integration follows the rename automatically. No code change
  required beyond updating `APP_NAME` in `src/constants.ts` and
  any documentation that refers to the repo by name.

#### 16g. Secret hygiene — layered defense

Rule of thumb: **secrets never enter the repo, even by accident.**

Layers, top to bottom:

1. **`.env` at repo root, gitignored.** Local dev secrets only. Loaded
   by Vite/Vinxi automatically. `VITE_` prefix = exposed to browser
   bundle (intentional, e.g. `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`). No prefix = server-only.
2. **`.env.example` committed.** Documents which variables exist with
   placeholder values. The contract for what a fresh clone needs.
3. **GitHub Actions secrets** for CI/CD (Settings → Secrets and
   variables → Actions). Never inline in workflow YAML.
4. **Service-role keys NEVER in the browser.** Only in my local `.env`
   and the Supabase dashboard. Anon key is RLS-bounded and safe to ship.
5. **`gitleaks` pre-commit hook.** Blocks commits containing common
   secret patterns (JWT prefixes, `sk_live_`, `service_role`, long
   base64 near keywords). Installed by
   `scripts/install-toolchain.sh`. Hook config in
   `.gitleaks.toml`.
6. **Rotate immediately if leaked.** Assume any leaked key is
   compromised within minutes (GitHub is scraped continuously).
   Supabase regenerate-keys flow lives in dashboard.

Explicitly **not** adopting (overkill for a solo side project):
1Password CLI / doppler / SOPS / vault. Revisit if the team grows.

#### 16h. Toolchain reproducibility — install scripts

- `scripts/install-toolchain.sh` is the **single entry point** for
  setting up a new dev machine. Installs `supabase` and `gitleaks`
  binaries to `~/.local/bin` (no sudo), versions pinned with
  sha256 checksums.
- `scripts/verify-toolchain.sh` is **read-only**; reports installed vs
  pinned vs latest upstream versions. Run any time to see if a tool
  upgrade is available.
- Bumping a pinned version = edit `PINNED_VERSION` + refresh
  `PINNED_SHA256` in the relevant `install-*.sh`, re-run
  `install-toolchain.sh`. Commit the change.
- Node, pnpm, git are **prerequisites** (not installed by the script);
  the script errors clearly with install hints if missing.

### 17. Licensing & brand protection

This section captures **what is protected and how**, separating two
things that are commonly conflated: the **code license** (a copyright
instrument) and the **brand** (a trademark instrument).

#### 17a. Honest baseline — what licensing CAN and CANNOT do

A software license is a copyright instrument. It governs **the code**
this project ships.

- **What a license CAN do:** require people who fork or redistribute
  the code (or run a modified hosted version) to follow specific terms
  — typically attribution, source disclosure, and same-license
  redistribution.
- **What a license CANNOT do:**
  - Stop someone from **rewriting the same product from scratch**.
    Ideas, concepts, UX flows, and feature lists are not copyrightable.
  - Stop someone from **rebranding the same idea** under a different
    name. That's a trademark question (§17c).
  - Stop someone from **using your product** as a normal user.

Read every claim of "open source protection" with this in mind.
Anything stronger than the above requires either trademark, patent
(not appropriate here), or a non-OSS source-available license that
restricts use itself.

#### 17b. Code license — AGPL-3.0-or-later

- **Decision:** **GNU Affero General Public License, version 3.0 or
  later** (`AGPL-3.0-or-later`).
- **Why this one over alternatives:**
  - **MIT / Apache 2.0** — fully permissive. Anyone can fork, close
    the source, and run a hosted competitor with no obligation to
    publish changes. Rejected: too weak for the owner's intent.
  - **GPL-3.0** — copyleft for distributed binaries, but **does not
    cover network use**. A SaaS competitor can fork, modify, host, and
    keep their changes private. Rejected: SaaS loophole.
  - **AGPL-3.0** — copyleft + **§13 network-use clause**. If someone
    runs a modified version as a network-accessible service, they must
    offer the source of their modifications under AGPL. Closes the
    SaaS loophole. **Selected.**
  - **BSL / FSL / Elastic License** — source-available, restricts
    competing commercial hosting. Stronger anti-competitor protection
    than AGPL but **not OSI-approved**, splits the contributor
    community, and creates legal-review friction for anyone integrating
    the project. Rejected: cost of legal weirdness exceeds the
    incremental protection over AGPL for a side project.
  - **All Rights Reserved (no license)** — public repo with no license
    means **no one may legally use the code**, including good-faith
    contributors. Rejected: hostile.
- **`-or-later` choice (§17b.1):** picked over `AGPL-3.0-only` so the
  project can be redistributed under future FSF revisions without a
  separate re-licensing step. Standard FSF recommendation.
- **Used by:** Mastodon, Bitwarden, Nextcloud, Plausible, Grafana
  (originally) — all projects with similar "open but
  not-easily-forkable" requirements.
- **Acknowledged downsides:**
  - Some companies' legal departments forbid AGPL dependencies. This
    constrains who can integrate or contribute. Acceptable for a side
    project where contribution is nice-to-have, not load-bearing.
  - "Source must be made available" is a real compliance burden on
    anyone who modifies the code; that's the deterrent, but it can
    feel adversarial to casual forkers.

#### 17c. Brand protection — `TRADEMARK.md`, registration deferred

- **Decision:** ship a **`TRADEMARK.md`** at repo root that **reserves
  the project name and logo** from derivative works. Forks are required
  by the trademark notice to **rename** before redistributing. The AGPL
  itself does not address trademarks; this file fills that gap.
- **Registration timing:** actual trademark registration (EUIPO + USPTO,
  classes 9 + 42 per §14d) happens **after the name is locked in**.
  Until then, `TRADEMARK.md` asserts unregistered ("common law")
  rights — weaker than registration but not nothing, and standard
  practice for pre-registration projects.
- **Scope of the reservation:**
  - The project name (placeholder `APP_NAME` for now per §14i) and any
    associated wordmark.
  - The logo / brand mark (mirror-motif visual identity per §14f),
    once designed.
  - The combined name + logo lockup.
- **Out of scope of `TRADEMARK.md`** (these stay AGPL):
  - The codebase itself.
  - Generic UI elements, color tokens, typography choices that aren't
    distinctive of the brand.
  - Documentation prose.

#### 17d. Pre-launch legal review

- **Owner action item, added to Phase 10 of `HANDOFF.md`:** before
  public launch, get a real lawyer to review the LICENSE choice, the
  TRADEMARK.md text, the privacy policy, and the terms of service.
  AI-assisted drafts of these documents are starting points, not
  substitutes for legal advice.
- **Region:** EU lawyer recommended given Supabase EU region (§12d) and
  GDPR controller obligations.

#### 17e. Files this section produces

The license decisions land as concrete files at repo root:

- `LICENSE` — full text of the AGPL-3.0 license.
- `TRADEMARK.md` — brand reservation notice; references LICENSE for
  code terms.
- `README.md` — declares the license + brand stance prominently near
  the top.
- Source files do **not** carry per-file SPDX headers in MVP (overkill
  for a solo project; revisit if contributor count grows).

## Working agreement

- We are still in design phase. No code yet.
- Decisions get appended to this file as we make them.
- After all major decisions, we produce a list of PRDs / tasks (handoff).
- Implementation happens task-by-task afterwards.
- **Meta-rule:** any new design decision learned in a session is written
  back to `DESIGN.md` (and `HANDOFF.md` task list updated) before moving
  on. If files grow unwieldy, split per-phase or per-section, but never
  lose decisions to chat history.
