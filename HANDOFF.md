# Handoff — Couples Gamification App

This document hands off the design phase to the next session. The next
session's job is **either**:

1. **Pick up branding / naming** once the owner has chosen a name and
   verified it per the checklist in `DESIGN.md` §14d, OR
2. **Start implementation**, working through the prioritized task list
   below one task at a time.

> All design decisions are captured in `DESIGN.md` in this folder.
> **Read it first.** This handoff does not duplicate that content —
> it points at it and adds the implementation plan.

## Suggested skills for the next session

- **`pragmatic`** — when writing or editing code; bias toward caution,
  surface assumptions, minimal surgical changes.
- **`grill-me`** — only if revisiting a deferred design question
  (offline behavior, name, branding visuals).
- **`customize-opencode`** — N/A; this is the owner's own app, not
  opencode configuration.

## What's done

- All major MVP design decisions are locked in. See `DESIGN.md`
  sections 1–13.
- Section 14 (branding & app name) is **deferred** with a verification
  checklist for the owner to use before locking in a name.
- No code has been written. No `package.json`, no `pnpm install`, no
  Supabase project provisioned. Repo contains only `DESIGN.md` and this
  handoff.

## What's NOT done / deferred decisions

- **App name** — `DESIGN.md` §14. Still not chosen. Two sessions of
  exploration captured in §14f–§14i. Owner has a defended candidate
  ("Long Term Performance" / `lp9`) and an open list of two-word
  alternatives. Decision deferred; not blocking until Phase 9 (homepage).
  Until then, code uses an `APP_NAME` constant so rename is trivial.
- **Mirror motif as visual identity** — locked in (§14f), independent of
  whichever name wins. Brand mark should explore symmetry / reflection.
- **Branding visuals** (logo, palette, typography) — depends on name.
- **Offline behavior / optimistic UI** — pin down at implementation time
  when writing the data-access layer (§9c gives the shape).
- **Bonus weekly heart** — schema reserve deferred; ship the feature
  later (§5a).
- **Realtime via Supabase channels** — deferred; polling/focus-refresh
  in MVP (§9).
- **Web push, PWA install** — deferred (§8).
- **Coupon "cooldown" between redemptions** — not in MVP (§6d).
- **Family archetype / groups of 3+** — out of scope (§4, §6c).
- **Ping / nudge feature** — deferred (§7).
- **Email digest for hearts beyond MVP throttle** — deferred (§8).

## Critical context the next agent must internalize

These are the **product principles** that have to inform every
implementation decision. They are scattered through `DESIGN.md`; here
they are condensed:

1. **The app trains people to notice and verbalize appreciation that
   day-to-day life would leave unsaid.** Every UI decision should
   reinforce this; nothing should feel transactional.
2. **Don't poison the game.** Specifically: hearts amounts are
   immutable, deletion windows are tiny and silent, lifetime totals are
   tracked but hidden from users to prevent score-keeping arguments.
3. **Both partners must feel good** about anything on each other's
   wishlists. Coupons are draft until the deliverer approves. App
   prompts the conversation; it doesn't replace it.
4. **Anonymous-first, optional Google upgrade.** Users can try the app
   fully without an account. The warning about data-loss-without-account
   must be honest: data is on Supabase, not "only on your device" — say
   "you can't recover it without an account."
5. **Real E2E for comments, never obfuscation.** The per-relationship
   key is generated client-side, embedded in the QR code, stored only
   in IndexedDB, recovered only via a user-set password (PBKDF2 +
   wrapped blob in Supabase). Forgotten password = old comments
   unreadable forever. This is correct and honest.
6. **MVP scope is meaningful but not small.** Resist scope creep
   ruthlessly. If a feature isn't in `DESIGN.md` as MVP, push back
   before building.

## Required-content blockers before public launch

These cannot be skipped:

- `/privacy` page with real content (Google OAuth approval blocker).
- `/terms` page.
- Supabase project provisioned in EU region (Frankfurt or Ireland).
- Supabase DPA signed.
- Account-delete and data-export flows actually working.

## Implementation plan — phased

Each phase is roughly a milestone that should be demoable to the owner
before moving on. Phases are **not** parallel; complete in order.

---

### Phase 0 — Repo & infrastructure bootstrap

Goal: a deployable empty SolidStart site on GitHub Pages with the right
toolchain. No app logic yet.

- [ ] **0.1** Initialize SolidStart + Vinxi project at repo root (mirror
  setup at `~/own/m-tynki/solid-site`, but **do not** copy CSS or
  components). pnpm, TypeScript strict, `preset: "static"`.
- [ ] **0.2** Configure `app.config.ts` with `BASE_PATH` handling
  (m-tynki §"Base Path Handling" pattern) for beta vs. production repo.
- [ ] **0.3** Set up `entry-server.tsx` with HTML shell, theme init
  inline script (light/dark/system, §12f), `<base href>` from
  `BASE_PATH`.
- [ ] **0.4** Set up `entry-client.tsx` (use SolidStart's default
  client-side routing — unlike m-tynki we want SPA navigation inside
  `/app/*`, see §11b).
- [ ] **0.5** Hello-world routes: `/`, `/privacy`, `/terms`, `/app`
  (placeholder content).
- [ ] **0.6** GitHub Actions deploy workflow (port from m-tynki
  `.github/workflows/deploy.yml`); two remotes (`beta`, `origin`)
  pattern.
- [ ] **0.7** Provision two GitHub repos (beta + production); confirm
  deploy works end-to-end on beta.
- [ ] **0.8** Add `404.html` fallback for `/app/*` deep links on GH
  Pages (§11b).
- [ ] **0.9** Set up theme toggle component + CSS custom properties for
  light/dark on `:root` and `[data-theme="dark"]`. Use logical CSS
  properties (§12e).

**Verification:** `pnpm build` succeeds; deployed beta URL serves
homepage, privacy, terms, and an `/app` placeholder; theme toggle works
without flash; deep-link to `/app/anything` lands on the app shell.

---

### Phase 1 — Supabase + auth foundation

Goal: anonymous users can sign up, see their own profile, and the data
layer abstraction is in place.

- [ ] **1.1** Provision Supabase project in **Frankfurt or Ireland**
  (EU region — §12d).
- [ ] **1.2** Sign Supabase DPA.
- [ ] **1.3** Enable Anonymous Sign-in in Supabase auth settings.
- [ ] **1.4** Install `@supabase/supabase-js`; create a single Supabase
  client module; env vars for URL and anon key (committed `.env.example`,
  real values in GH Actions secrets).
- [ ] **1.5** Create `profiles` table (§13a) + trigger to auto-create
  `profiles` row on `auth.users` insert.
- [ ] **1.6** RLS on `profiles`: own row + relationship co-members
  (§13c).
- [ ] **1.7** Thin data-access layer: a module that exposes typed
  functions like `getMyProfile()`, `updateMyProfile()`. **All Supabase
  calls go through this layer** — engine is swappable later.
- [ ] **1.8** A SolidStart store/cache shape that exposes `refresh()`
  for each entity (§9c). Wire up tab-focus refresh.
- [ ] **1.9** Onboarding screen for first-launch: anonymous sign-in
  fires, ask display name + locale + archetype hint (selection saved for
  use at pair time).

**Verification:** open app in fresh browser → anonymous user created →
profile row appears in Supabase → display name persists across reload.

---

### Phase 2 — Pairing + encryption foundation

Goal: two users on two devices can pair via QR; per-relationship
encryption key exists; password-wrapped recovery works.

- [ ] **2.1** Create `relationships` + `pairing_invites` tables (§13a).
- [ ] **2.2** RLS + RPCs: `create_pair_invite`, `redeem_pair_code`
  (§13d).
- [ ] **2.3** WebCrypto helpers: generate AES-GCM key, generate per-
  message IV, encrypt/decrypt. **No third-party crypto library.**
- [ ] **2.4** IndexedDB key store: store/retrieve per-relationship
  symmetric key. Never persists to Supabase in plaintext.
- [ ] **2.5** QR generation (use `qr-code-styling` or `qrcode` lib —
  pick the smaller; verify license is permissive). QR payload encodes
  `code + base64(key)`.
- [ ] **2.6** QR scanning (use `html5-qrcode` or browser BarcodeDetector
  API with fallback). Permission prompt UX.
- [ ] **2.7** Pair flow UI: inviter sees QR + a manual code; redeemer
  scans QR or pastes code; both land in the same relationship.
- [ ] **2.8** Password-wrapped key recovery (§12b):
  - PBKDF2-SHA256, 600k iterations, per-relationship salt.
  - "Set recovery password" prompt right after pair success.
  - "Change password" flow in settings.
  - On new device: enter password → unwrap → key restored to IndexedDB.
- [ ] **2.9** Warning UI: clear, prominent at pair time and in settings
  about what password-recovery does and doesn't recover. Use the
  honest phrasing from §3 and §12b.

**Verification:** two browsers (or one browser two profiles) pair via
QR; both can see the same relationship; encryption key is in IndexedDB
on both, never in Supabase; clearing one browser's IndexedDB → after
re-pair the user can recover the key by entering their password.

---

### Phase 3 — Core points loop (hearts)

Goal: paired users can give each other hearts with encrypted comments.

- [ ] **3.1** Create `points` table + indexes (§13a, §13e).
- [ ] **3.2** RLS + RPCs: `give_points`, `edit_point_comment`,
  `delete_point` enforcing time windows (§13d).
- [ ] **3.3** Heart-giving UI: 1–5 hearts selector, optional comment
  (200-char cap, §12c), optional backdated event date (§5c).
- [ ] **3.4** Comment encryption on send (client-side); decryption on
  read.
- [ ] **3.5** Hearts feed on dashboard: chronological, decrypts
  comments client-side, "edited" badge after 24h-window edit, 5-min
  silent delete UX.
- [ ] **3.6** Spendable balance computation (§13b) — derived in the
  store from points and claims; never stored.
- [ ] **3.7** Privacy mode foundation (§15):
  - Add `@solid-primitives/storage`.
  - Global `privateMode` signal, defaults ON at every app launch
    (sticky within session, resets on reload — §15c).
  - Privacy-mode toggle (eye icon) in app header.
  - Hearts feed respects private mode: comments collapse to
    "💬 Comment hidden in private mode" placeholder (§15d).

**Verification:** Alice gives Bob hearts with a comment; Bob sees it
decrypted; Alice's spendable balance updates correctly; edit window
behavior matches §5d; delete window matches §5d; toggling private mode
hides/shows comments correctly; reloading the app re-enables private
mode by default.

---

### Phase 4 — Wishlists + coupon approval

Goal: each partner has their own wishlist; coupons require partner
approval before they're claimable.

- [ ] **4.1** Create `coupons` table (§13a).
- [ ] **4.2** Hardcode three archetype templates as JSON in repo
  (§6c). Tone: gentle.
- [ ] **4.3** RPCs: `submit_coupon`, `approve_coupon`, `retire_coupon`
  (§13d).
- [ ] **4.4** Wishlist UI: my list (editable, drafts visible to me +
  partner); partner's list (read-only with "approve" actions).
- [ ] **4.5** Onboarding: after pair success, pick archetype → one-tap
  add starter templates to draft list. Each still requires partner
  approval.
- [ ] **4.6** Coupon details: title, description, boundaries note,
  emoji, price (immutable). UI guidance text for boundaries (§6b).
- [ ] **4.7** Retire flow: refunds pending claims.
- [ ] **4.8** Per-coupon private flag (§15b):
  - Persisted set of coupon IDs in `localStorage` via
    `makePersisted` (per-device-local, per-user; no server sync in MVP).
  - "Mark private / unmark" action on each coupon row in wishlist views.
  - In private mode, flagged coupons render as locked placeholder row
    ("🔒 Hidden coupon — turn off private mode to view") instead of
    their real content (§15d).
  - Flags affect only this device's owner's view; partner viewing the
    same coupon on their device sees it normally unless they flagged it
    on their own device (§15b).

**Verification:** Alice adds a draft coupon → Bob sees it pending
approval → Bob approves → coupon becomes claimable on Alice's list.
Alice marks coupon X private on her device → with private mode on,
X shows as locked placeholder; with private mode off, X shows normally.
Bob's view of X is unaffected by Alice's flag.

---

### Phase 5 — Coupon claim/escrow flow

Goal: the two-step claim → accept → deliver lifecycle works end-to-end
with refunds and timeouts.

- [ ] **5.1** Create `coupon_claims` table (§13a) + indexes.
- [ ] **5.2** RPCs: `claim_coupon`, `accept_claim`, `decline_claim`,
  `deliver_claim`, `nudge_claim` with all rules (§13d).
- [ ] **5.3** Claim UI: confirm before claiming (shows price), escrow
  balance display.
- [ ] **5.4** Pending-claims view for deliverer: accept / propose later
  / decline with reason.
- [ ] **5.5** Scheduled coupons view; "mark delivered" button.
- [ ] **5.6** Nudge button (visible after 7 days, rate-limited per
  §13d).
- [ ] **5.7** Scheduled job (pg_cron or Supabase Edge Function, daily):
  auto-refund claims older than 14 days.
- [ ] **5.8** History view: delivered + declined + refunded claims.

**Verification:** full lifecycle works: claim → accept → deliver →
points spent. Plus: claim → decline → refund. Plus: claim → 14 days
silent → auto-refund.

---

### Phase 6 — Email notifications

Goal: transactional emails for coupon events + throttled hearts nudge.

- [ ] **6.1** Configure Supabase SMTP for transactional emails.
- [ ] **6.2** Create `user_settings` table (§13a) + RLS.
- [ ] **6.3** Settings UI: toggles for each email category, defaults
  per §8b.
- [ ] **6.4** Send emails on coupon events (RPCs trigger sends via
  Supabase Edge Function, queued to keep RPCs fast).
- [ ] **6.5** Daily cron: check throttled hearts nudge per
  `last_hearts_email_at` (§8b); send one email per relevant receiver.
- [ ] **6.6** All emails respect user's locale; templates in en/pl/de.
- [ ] **6.7** All emails have an unsubscribe / settings link.

**Verification:** Alice claims → Bob gets email immediately. Bob gives
Alice 3 hearts → Alice gets at most 1 email next day cycle. Toggling
off in settings stops the relevant emails.

---

### Phase 7 — i18n

Goal: the entire app available in English, Polish, German.

- [ ] **7.1** Add `@solid-primitives/i18n` (§12e).
- [ ] **7.2** Extract all hardcoded strings to `src/locales/en.json`.
  Add empty `pl.json`, `de.json`.
- [ ] **7.3** Translate to pl. Verify Polish plural forms (4 forms).
- [ ] **7.4** Translate to de. Owner personally reviews quality.
- [ ] **7.5** Locale switcher in settings; persist to localStorage and
  user_settings.
- [ ] **7.6** Date/number formatting via `Intl.*`.
- [ ] **7.7** Audit CSS for `margin-left`/`padding-right` etc.; replace
  with logical properties (`margin-inline-start`, etc.) for RTL-ready.

**Verification:** switching locale updates all UI strings; no
hardcoded English remains; layout doesn't break in any locale.

---

### Phase 8 — GDPR + privacy + content pages

Goal: the legal/compliance blockers for public launch are resolved.

- [ ] **8.1** Write `/privacy` content (real, not lorem ipsum). Cover:
  what we collect, why, retention, Supabase as processor, EU region,
  user rights, controller contact, encryption disclosure (honest:
  comments E2E-encrypted, everything else server-readable).
- [ ] **8.2** Write `/terms` content.
- [ ] **8.3** Account delete flow in settings: confirmation modal,
  RPC that cascades deletes. Also deletes encryption keys from
  IndexedDB.
- [ ] **8.4** Data export in settings: JSON download. **Decrypts
  comments client-side** before download so it's actually useful.
- [ ] **8.5** Cookie/storage banner: honest about IndexedDB +
  localStorage use; consent persisted in localStorage. Mirror
  m-tynki's `CookieBanner.tsx` pattern.
- [ ] **8.6** Enable Google OAuth in Supabase; production OAuth client
  registered with privacy+terms URLs. Linking flow in settings (§3,
  §10).

**Verification:** account delete actually removes all rows + IndexedDB
keys; data export downloads valid JSON with decrypted comments;
Google linking preserves `auth.uid()`.

---

### Phase 9 — Homepage + SEO polish

Goal: a homepage that explains the product and converts visitors to
sign-up.

- [ ] **9.1** Write homepage copy: hero, "how it works" section,
  honest section about encryption + privacy.
- [ ] **9.2** Visual design (depends on locked-in name + branding —
  see §14e).
- [ ] **9.3** SEO meta tags (port `SeoHead.tsx` pattern from m-tynki).
- [ ] **9.4** Generate `sitemap.xml`, `robots.txt`, `llms.txt` (m-tynki
  pattern: `scripts/generate-seo.mjs` runs before build).
- [ ] **9.5** Open Graph image (depends on branding).
- [ ] **9.6** Verify Lighthouse perf + accessibility ≥ 90.

**Verification:** homepage prerenders to static HTML; SEO tags present;
sitemap covers all SSG routes.

---

### Phase 10 — Pre-launch checklist

- [ ] **10.1** Run owner's name verification checklist (§14d) — domain
  registered, trademark cleared, social handles secured.
- [ ] **10.2** Custom domain pointed at production GH Pages repo with
  HTTPS.
- [ ] **10.3** Confirm Supabase DPA signed, project in EU region.
- [ ] **10.4** Real-user testing with 2–3 friendly couples for at
  least a week. Iterate based on feedback (especially around the
  warning prompts and recovery password flow — those are easy to get
  wrong).
- [ ] **10.5** Decide on analytics: in keeping with the m-tynki
  pattern, **no third-party trackers** is recommended. Consider
  privacy-respecting server-side aggregate (e.g., from Postgres) for
  growth metrics only.

## Open questions for next session

These came up implicitly but were not resolved:

- **Q-A:** Should pair invites be revocable by the inviter before
  consumption? (Probably yes — trivial RPC. Add in phase 2.)
- **Q-B:** Should a user be able to **archive** a relationship rather
  than delete it? (Yes — `relationships.status='archived'` already in
  schema; UI flow in phase 8 or later.)
- **Q-C:** What happens to a relationship if one member deletes their
  account? Options: hard-cascade both partners' shared data; or
  "tombstone" — leave the data, mark the deleter as a generic
  "removed user." MVP recommendation: hard-cascade (simpler, more
  GDPR-aligned). Owner should weigh in.
- **Q-D:** Offline behavior — do we queue writes when offline and
  flush on reconnect, or simply disable write actions? MVP
  recommendation: **disable write actions when offline**, show a
  friendly banner. Queueing introduces conflict-resolution complexity
  not worth MVP time.

## Meta-rule for future sessions

Any new design decision made in conversation must be written back to
`DESIGN.md` (and reflected in the relevant phase tasks here) **before**
moving on. Do not let decisions live only in chat history. If files
grow unwieldy, split per-phase or per-section.

## Files in this folder

- `DESIGN.md` — all design decisions (read first).
- `HANDOFF.md` — this file.
