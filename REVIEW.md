# REVIEW.md — open review findings

> **Status:** the orchestrator's own review. The independent reviews
> (technical + UX subagents) did NOT complete (gateway time-outs); re-run
> them in small scopes (see `NEXT_SESSION.md`). Nothing below is fixed
> yet unless marked FIXED. Promote items to PRDs to fix; strike them here when done.

## Technical — security (verified live)

1. **FIXED (PRD-54, live-probed) — HIGH — any member can UPDATE any column of their relationship
   row directly** (`0002` policy "members update relationship", no
   column restriction). Verified via PostgREST:
   - overwrite/destroy the partner's recovery blob (`wrapped_key_blob`,
     `wrap_salt`) -> the partner can never restore notes;
   - set `status = 'archived'` unilaterally (no RPC, no flow);
   - **swap `member_a`/`member_b` to an outsider's id** -> hijack the
     relationship: the outsider gains read access to all points,
     coupons, claims, and the partner's profile.
   Fix: drop the UPDATE policy entirely (writes via `set_recovery_
   password` RPC already exist); add explicit RPCs for archive/unpair
   later.
   **Probe to re-check** (throwaway Node script with `@supabase/supabase-js`
   + `.env`, run from the repo root, delete after): sign in two anon
   clients A/B, `create_pair_invite` (A) + `redeem_pair_code` (B), then as
   B `from("relationships").update({ status: "archived" }).eq("id", rel)
   .select("id")` and `update({ member_a: <outsider id> })`. Fixed = 0
   rows / RLS error. Also call helper functions as an outsider (e.g.
   `rpc("gen_pair_code")`) — fixed = permission denied. Note: `set_recovery_password` lets either member overwrite
   the shared blob; that's acceptable (same key), but log/confirm in UI.
2. **FIXED (PRD-54) — MEDIUM — helper functions callable by anon/any user** (Postgres
   grants EXECUTE to PUBLIC by default): `gen_pair_code`,
   `is_relationship_member` (lets anyone probe membership of any
   relationship id: returns true/false for the caller only, low
   impact), `check_point_comment`, `check_coupon_fields`, `coupon_opt`,
   `check_claim_note`, `handle_new_user`(?). Fix: `revoke execute ...
   from public, anon, authenticated` for helpers not meant as API.
3. **MEDIUM — pairing code brute force**: 8 chars from a 31-char set
   (~8.5e11) is fine against guessing, but `peek_pair_code`/
   `redeem_pair_code` have no rate limit and leak "valid/used/expired"
   distinctions. Low practical risk; the AES key isn't in the code, so a
   guessed code gives pairing without the key (notes unreadable) but
   DOES create a relationship with the victim's invite. Fix: generic
   error + consider rate limiting (per-user attempts table).
4. **MEDIUM — `pair_invite_pending` stores the raw AES key (base64) in
   localStorage** until pairing completes (PairFlow). XSS or a shared
   device would expose it. It's already in IndexedDB; store only the code
   in localStorage and read the key from the keystore.
5. **LOW — AES keys are `extractable: true`** (`aes.ts:21,33`). Needed
   for QR export + recovery wrap on the inviter; imported keys could be
   non-extractable except when re-wrapping for recovery. Consider
   re-importing as non-extractable after wrap.
6. **LOW — anonymous users + invites are never cleaned up** (expired
   `pairing_invites`, abandoned anon `auth.users`). Add a periodic
   cleanup or a lazy delete in `create_pair_invite`.
7. **LOW — server `current_date` is UTC**; `event_date` (+1 tolerated)
   and `accept_claim` (-1 tolerated) accept this. OK, but documented only
   in no-human-decisions.

## Technical — correctness / code quality

8. **MEDIUM — `retire_coupon` lets either member cancel the partner's
   accepted claim** by retiring (D-35.1 allows either member to retire).
   Probably fine (refunds), but surprising for the claimer; show who
   retired, or restrict retire to "no open claims" + a confirm.
9. **MEDIUM — duplicate refetches**: Dashboard mounts and refreshes
   points + claims + coupons; tab switch refetches coupons + claims;
   focus handlers in Dashboard (x2) + `usePointsFocusRefresh` +
   profile/relationship focus refreshes all fire on every focus. ~6
   requests per focus. Consolidate into one `useFocusRefresh` per
   relationship with throttling (IDEAS tech-debt already lists it).
10. **MEDIUM — per-note `setInterval` (15s)** in `HeartNote` — 50 notes
    = 50 timers. Use one shared clock signal.
11. **LOW — `MyWishes` `matchMedia` read once at mount** (not reactive to
    rotate/resize).
12. **LOW — dead/legacy code**: PairBadge still carries the old switch
    menu + `pairs/onSwitch/onAddPartner` props (now in AppBar);
    `getMyActiveRelationship` only used by PairFlow polling;
    `DeviceSettings.onKeyRestored` unused; CSS `.balance*`,
    `.dashboard-head`, `.tabs/.tab`, `.pair-badge` switcher styles and
    old `.coupon-main` grid definitions superseded.
13. **LOW — `global.css` is 2.4k lines appended in chunks** with
    duplicate selectors: `.chip--approved` (x2), `.cal-dot`, `.pair-menu`,
    `.coupon-main` (plain + `.ticket` overrides), `.coming-up` margins.
    Split into files per area (tokens, base, controls, appbar, worlds,
    tickets, claims, calendar, pairing) and dedupe.
14. **LOW — PairFlow.tsx ~450 lines**; Dashboard ~300; split views.
15. **LOW — `friendly*Error` mappers x4** with identical shape; one helper.

## Testing / CI

16. SQL behaviour is only checked by throwaway live smoke scripts
    (points 20/20, coupons 21/21, claims 30/30), not in CI. Add a
    pgTAP/supabase-local job or commit the smoke scripts as a manual
    `scripts/smoke/` with a no-secrets `.env` read.
17. Browser E2E scripts live in `/tmp/opencode/pw/` (not in repo); they
    will be lost. Move to `tests/e2e/` (Playwright), run manually or in
    CI against a preview.
18. QA adversarial suites predate PRD-49 UI; some assert removed copy
    (were patched). QA pass pending for PRD-28..51.

## Done well
- All writes via SECURITY DEFINER RPCs with `search_path=''`, row locks,
  advisory lock on claim; the parallel double-claim race was verified.
- E2E comment encryption never falls back to plaintext; key via URL
  fragment (never sent to the server), password-wrapped recovery.
- Strict TS, 0-warning lint, ~400 unit tests, CI gates build.
- Consistent DOX docs; decisions logged with dates.

## UX / UI (orchestrator's own review; independent UX review pending)

Top findings:
1. **HIGH — first-run is long before the first heart:** home -> app ->
   name + language + archetype -> pair (invite/join, QR) -> recovery
   password overlay (heavy warning) -> finally Give. Move the archetype
   to invite creation and defer the recovery prompt (banner after the
   first note).
2. **HIGH — vertical space on mobile:** app bar (~57px) + sticky section
   head (~44px) + bottom tab bar (61px) ≈ 160px of 780 fixed chrome
   (~20%); worse with the keyboard open in forms (the bottom bar stays
   up). Hide the tab bar while an input is focused; shrink the app bar
   on scroll.
3. **MEDIUM — glyph overload:** text glyphs as icons (♥ ✦ ❀ ◔ … ➜ ✓ ○ ↺ ?)
   render inconsistently across fonts/OS and compete with emoji coupon
   icons. Replace with one small SVG icon set (stroke 1.8, like
   the home/⋯ icons).
4. **MEDIUM — colour count:** rose (hearts + Give) + amber + sage +
   terracotta accent + a heart-soft tint ~ 5 hues. Give = rose collides
   with the heart colour; the rose "Claim"/affordable is also Give's
   colour. Consider Give = ink/neutral (as PRD-49 first proposed) so rose
   stays "hearts" only.
5. **MEDIUM — jargon:** "claim", "set aside", "retire", "Agreed",
   "Withdraw". Softer: "Use hearts", "saved for this", "Remove from
   list", "Yes from Ben", "Take back".
6. **MEDIUM — tap targets:** link-buttons in coupon/claim footers
   (Edit, Delete, Retire, Mark private, Details) are text-sized (~20px
   tall), below 44px. Group rarely-used ones into a "⋯" per card.
7. **MEDIUM — card action overload:** an agreed coupon shows chip +
   "N more" + Retire + Mark private; a claim shows up to 4 actions.
   Progressive disclosure: one primary action, the rest in the card menu.
8. **LOW — empty states** are text-only; add small illustrations/
   one-line prompts per world (the most-seen screens for new couples).
9. **LOW — Coming up** is shown even when empty (takes space for new
   couples; already in IDEAS).
10. **LOW — no confirmation moment/delight** on the key actions (heart
    sent, claim accepted, delivered): see "Delight" ideas in IDEAS.md.

Works well: calm paper/ink palette and serif notes; ticket metaphor;
worlds + sticky tinted headers orient well; balance pill always visible
+ explainer; honest copy about anonymity and encryption.
