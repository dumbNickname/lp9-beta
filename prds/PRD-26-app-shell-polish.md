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

**Out:**
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

(none — decision locked in `no-human-decisions.md` D-26.1: nav +
dropdowns + light polish now, full redesign deferred.)
