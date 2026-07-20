# PRD-26 — App shell polish + navigation + mobile selectors

## Goal

Make the app navigable and presentable on mobile. Owner feedback: no way
to move between pages, pages look very raw, and the archetype/locale
pickers break layout on mobile.

## Scope

**In:**
- **Navigation:** a shared header (and/or footer) with links between the
  main pages — home (`/`), app (`/app`), privacy (`/privacy`), terms
  (`/terms`). Respect the GitHub Pages `BASE_PATH` (use the router base /
  `SERVER_BASE_URL` so links work under `/lp9-beta/`). The existing
  `ThemeToggle` stays in the header. Links must be keyboard-accessible.
- **Selectors -> dropdowns:** convert the archetype picker (Onboarding /
  pair flow) and the locale picker to native `<select>` dropdowns so they
  don't break layout on small screens. Keep values/semantics identical
  (archetype: getting_to_know / established_couple / close_friends;
  locale: en / pl / de). Labels associated for a11y.
- **Light styling pass (theme tokens only):** a first-pass visual cleanup
  using the existing semantic tokens in `src/styles/tokens.css` — spacing,
  readable max-width/container, button styling, form field styling,
  callouts, headings. Mobile-first, logical CSS only. NO new color hues,
  NO brand overhaul (name/brand still pending §14i). Goal: "clean and
  tidy," not a redesign.
- Keep `APP_NAME` constant usage (no hard-coded product name).
- **Reset account escape hatch (D-26.2):** a small "Reset account" action
  in the app shell that clears local device state (IndexedDB keys via
  keystore, pairing/recovery localStorage markers) and signs out so a
  reload yields a fresh anonymous user. Unblocks pairing re-testing on a
  real device (mobile, no incognito) when the anon user is already paired
  (which otherwise skips PairFlow and lands on the recovery overlay).
  LOCAL only — does not dissolve the server-side relationship (that is the
  future "unpair" feature, see `no-human-decisions.md`). Confirm before
  wiping (destructive).

**Out:**
- Full server-side unpair / relationship dissolve (future PRD).
- Pairing flow logic (PRD-25).
- Full brand/visual redesign, custom fonts, illustrations (post-naming).
- i18n of nav copy (Phase 7) — English literals for now.

## Touched files / new files

- `src/app.tsx` and/or a new `src/components/AppHeader.tsx` /
  `SiteNav.tsx` — shared nav.
- `src/components/Onboarding.tsx` — archetype + locale as `<select>`.
- Wherever archetype is chosen in the pair flow (if applicable) —
  `<select>`.
- `src/styles/global.css` (+ maybe `tokens.css` only if a spacing/radius
  token is genuinely missing) — styling pass.
- Public route components (`src/routes/index.tsx`, `privacy.tsx`,
  `terms.tsx`) — add nav, minor layout.

## Data model impact

None.

## UI behavior

Every page has visible navigation to the others. Selectors are dropdowns
that work on mobile. Pages look clean and consistent in light + dark.

## Verification

1. Each page (`/`, `/app`, `/privacy`, `/terms`) shows working nav links
   to the others; links resolve correctly under the `BASE_PATH`.
2. Archetype and locale are `<select>` dropdowns; selecting a value
   updates state as before; no horizontal overflow at 320px width.
3. Theme toggle still works; nav + pages render correctly in light and
   dark (token-based, no raw hues).
4. Layout uses logical CSS properties only; no fixed widths causing
   mobile overflow.

**Unit tests (Dev):**
- Nav component renders the expected links with base-prefixed hrefs.
- Onboarding renders `<select>` for archetype + locale; changing a
  select updates the bound value; submit still works.
- Smoke: public routes render with nav present.

**QA suite:**
- Adversarial/consistency: nav present on all four pages; hrefs
  base-prefixed (no bare `/privacy` that 404s under sub-path); selects
  contain exactly the allowed options; no physical CSS props / raw hues
  introduced; renders without overflow at narrow widths (structural
  assertions); theme tokens used.

## Open questions

(none — decisions locked in `no-human-decisions.md` D-26.1 nav +
dropdowns + light polish; D-26.2 reset-account escape hatch.)

## Dev notes

### Files changed / added
- `src/components/SiteNav.tsx` (new) — shared nav; `<A>` links (Home/App/
  Privacy/Terms) auto-prefixed by the router `base`; Home uses `end` so it
  is not always `aria-current`.
- `src/app.tsx` — render `<SiteNav />` in the shared root header (so nav
  appears on every page, public + app), kept `<ThemeToggle />`.
- `src/components/Onboarding.tsx` — locale + archetype radio fieldsets ->
  native `<select>` in `<label>`; values/semantics unchanged (`en/pl/de`,
  `getting_to_know/established_couple/close_friends`).
- `src/lib/crypto/keystore.ts` — added `clearKeys()` (clear-all store).
- `src/lib/session.ts` — added `resetAccount()`: `clearKeys()`, remove
  only `pair_invite_pending` / `archetype_hint` / `recovery_prompted:*`
  localStorage markers (leaves `theme` etc.), `supabase.auth.signOut()`.
- `src/routes/app.tsx` — footer "Reset account (start fresh)" button with
  `window.confirm` guard; on confirm runs `resetAccount()` then reloads.
- `src/styles/global.css` — light polish (tokens + logical props only):
  header space-between + wrap, `.site-nav`/`.site-nav-link` (with
  `aria-current` underline), form control + `<select>` + button styling,
  focus-visible ring, secondary-button surface for toggle/copy/reset,
  `.app-reset` footer.

### Decisions taken while coding
- **Nav lives in the shared root header** (app.tsx), not per-route, so all
  four pages get it with one wiring point. No per-route edits needed.
- **Reset = local only** (D-26.2): clears device keys + pairing/recovery
  markers + signs out for a fresh anon user; does NOT dissolve the
  server-side relationship (future "unpair", logged in
  `no-human-decisions.md`).
- `<A end>` typed via a `{ end?: boolean }[]` literal; lint requires
  `<For>` over `.map` for JSX lists (applied in SiteNav + Onboarding).

### Self-test results
`pnpm typecheck` PASS, `pnpm lint` PASS (`--max-warnings 0`),
`pnpm test` PASS (45 files / 320 tests; +5 new), `pnpm build` PASS
(static; `.output/server` 0 files, `.output/public` present).

### New unit tests
- `tests/unit/site-nav.test.tsx` — renders the four links; hrefs
  base-prefixed under a `/lp9-beta` router base.
- `tests/unit/onboarding.test.tsx` — locale + archetype are `<select>`
  with exactly the allowed options; changing locale + submit calls
  `saveProfile` with the selected value.
- `tests/unit/reset-account.test.ts` — `resetAccount()` clears keys +
  the three marker kinds, signs out, and leaves unrelated keys (`theme`).

### For QA
- Live `BASE_PATH` check: nav hrefs resolve under `/lp9-beta/` (component
  test proves prefixing; confirm on the deployed sub-path).
- Reset button: confirm cancels safely; on confirm the device returns to a
  fresh anon onboarding state and is no longer stuck on the recovery
  overlay — this is the owner's pairing re-test unblock.
- No physical CSS props / no raw hues introduced (tokens only).
