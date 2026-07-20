# Next session — resume here

> Short handoff for the orchestrator (chat session) picking up the
> couples gamification app. Read this first; it points you at the
> right detailed docs in the right order.

## Where we are

- Design phase **complete**. All decisions in `DESIGN.md` (SS1-17).
- **Phase 0 complete and deployed.** Static site on GitHub Pages.
- **Phase 1 complete and deployed.** Supabase client, anon auth,
  profiles table + trigger + RLS, data-access layer, onboarding form.
  Live at `https://dumbnickname.github.io/lp9-beta/app`.
- **Phase 2 COMPLETE and deployed** (pairing + encryption). PRD-15..24
  all merged. Pairing works end-to-end (invite/QR/scan/paste/recovery).
  - PRD-15 (merged) — relationships + pairing_invites tables + RLS +
    `is_relationship_member` + co-member profile SELECT policy.
    Migration `0002_relationships_pairing.sql`.
  - PRD-16 (merged) — pairing RPCs: `create_pair_invite`,
    `redeem_pair_code`, `revoke_pair_invite`, `gen_pair_code`.
    Migration `0003_pairing_rpcs.sql`.
  - PRD-17 (merged) — WebCrypto AES-GCM helpers `src/lib/crypto/aes.ts`.
  - PRD-18 (merged) — IndexedDB key store `src/lib/crypto/keystore.ts`
    (added `fake-indexeddb` dev dep).
  - PRD-19 (merged) — QR generation: `src/lib/pairing/qr.ts`
    (`buildInvitePayload`/`parseInvitePayload`, format `v1:<code>:<keyB64>`)
    + `src/components/InviteQR.tsx`. Lib `qrcode@1.5.4` (MIT).
  - PRD-20 (merged) — QR scanning: `src/lib/pairing/scan.ts`
    (`isSupported`/`startScan`, native `BarcodeDetector`, no lib) +
    `src/components/QRScanner.tsx`. Manual fallback = paste full payload.
  - PRD-21 (merged) — Pair flow UI end-to-end: `PairFlow.tsx`,
    `lib/data/relationship.ts`, `lib/stores/relationship.ts`, gated in
    `app.tsx`. Inviter key stored under `invite:<code>` then migrated to
    rel id; 3s poll + focus-refresh detects consume. See
    `no-human-decisions.md` D-21.1/D-21.2.
  - PRD-22 (merged) — Password-wrapped key recovery: `lib/crypto/recovery.ts`
    (PBKDF2-SHA256 600k + AES-GCM wrap, blob = iv||ct), RPC migration
    `0004_set_recovery_password.sql`, `RecoveryPassword.tsx` (set/change/
    restore). Post-pair "set password" prompt is a one-time skippable
    overlay in the app shell (D-22.3). Server never sees key/password.
    NOTE: bytea `\x` hex round-trip unverified vs live DB — owner
    preview-branch check pending (see PRD-22 Dev notes + AGENTS.md gotcha).
  - PRD-23 (merged) — Pairing/recovery warning UI: `Callout.tsx`,
    `RecoveryWarning.tsx` (honest §3/§12b copy), wired into
    RecoveryPassword set/change modes.
  - PRD-24 (merged) — Pairing UX fixes (device bugs): QR now encodes a
    deep-link URL `<origin><base>app#pair=<payload>` (iOS Camera opens
    app), copy button on invite screen, `html5-qrcode@2.3.8` lazy
    fallback scanner for browsers without `BarcodeDetector` (iOS),
    `#pair=` deep-link auto-drives Join. See `no-human-decisions.md`
    D-24.1. Key rides in URL fragment (never sent to server).
- Single GitHub repo: `dumbNickname/lp9-beta`. Git remote is `beta`
  (`git push beta master`).
- Single Supabase project, `eu-central-1` (Frankfurt), GitHub
  Integration, production branch `master`. Migrations auto-apply on push
  to master. GH Actions secrets `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` are set.

## Deployment URLs to check

**Static public pages** (SSR, work without JS):
- `https://dumbnickname.github.io/lp9-beta/` — homepage
- `https://dumbnickname.github.io/lp9-beta/privacy` — privacy page
- `https://dumbnickname.github.io/lp9-beta/terms` — terms page

**App (SPA, needs JS + Supabase):**
- `https://dumbnickname.github.io/lp9-beta/app` — anon sign-in →
  onboarding form (name/locale/archetype) first visit; "Welcome back"
  after. Use incognito for a fresh anon user. Pairing flow live:
  Invite (QR deep-link + copyable invite URL + short code) / Join
  (camera scan via native or html5-qrcode fallback, or paste URL/payload).
  After pairing, a skippable "set recovery password" overlay appears.

**Supabase dashboard** (not public URLs):
- Table Editor → `profiles`, `relationships`, `pairing_invites`
- Database → Functions → `create_pair_invite`, `redeem_pair_code`,
  `revoke_pair_invite`, `gen_pair_code`, `is_relationship_member`,
  `handle_new_user`, `set_recovery_password`
- Authentication → Users → anon users appear after visiting `/app`

## What to do next — Phase 3 (core hearts loop)

Phase 2 is `merged`, so per the decomposition rule (`PROGRESS.md`) the
next step is to **decompose Phase 3** into concrete PRDs (currently a
`(not yet decomposed)` placeholder). Source: `HANDOFF.md` Phase 3 +
`DESIGN.md` §16a (from Phase 3 every PRD is a vertical slice:
migration → RLS → RPC → data layer → UI → tests).

Phase 3 = the first user-visible feature slice: giving **hearts** with an
E2E-encrypted comment (`points` table, §13a; encryption §12a; edit/delete
windows §5c/§5d). Write PRD-25+ and add rows to `PROGRESS.md`.

**Before Phase 3 coding, resolve/keep in mind:**
- Owner: verify PRD-22 bytea round-trip on the live/preview DB (see
  Owner action items) — hearts comments reuse the same crypto + bytea
  path, so confirming it now de-risks Phase 3.

## Owner action items (parked)

- **Verify Phase 2 migrations applied** on Supabase (Table Editor should
  show `relationships`, `pairing_invites`; Database → Functions should
  show the pairing RPCs + `set_recovery_password`).
- **Verify bytea round-trip on live/preview DB (PRD-22):** set a recovery
  password, then on a fresh browser (no IndexedDB key) fetch blob + enter
  password → key restored → an existing encrypted comment decrypts.
  Confirms the `\x`-hex bytea encode/decode assumption. If it fails, only
  `bytesToBytea`/`byteaToBytes` in `src/lib/data/relationship.ts` change.
- **Branch protection on `master`** not yet set (discipline-only).
- **Sign Supabase DPA** before public launch (Phase 8 / 10).
- **Pick the final app name** before Phase 9 (`APP_NAME` placeholder).

## Read order on resume

1. **This file** — orientation.
2. **`PROGRESS.md`** — current PRD status table.
3. **`DESIGN.md`** — full source of truth (esp. §12a/§12b encryption +
   recovery, §13a/§13c/§13d data model for pairing).
4. The PRD you're about to execute (`prds/PRD-19..23`).
5. **`HANDOFF.md`** — strategic phase plan.

## Workflow reminders (from AGENTS.md)

- One PRD at a time: branch/work locally, run
  `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, then commit
  + `git push beta master`. Keep git history simple.
- Update `PROGRESS.md` + PRD `## Dev notes` on each PRD completion
  (do this incrementally — session may drop).
- PRD ambiguity → load `grill-me` and stop. Terse comms → `caveman`.
- SQL migrations only via `supabase/migrations/NNNN_slug.sql`.
- Learned gotchas live in root `AGENTS.md` "Environment gotchas".
