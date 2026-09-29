# PRD-49 — App shell redesign: app bar, 3 worlds, ticket coupons

> Owner direction 2026-09-29 (grilled, all recommended picks + home icon).

## Goal
Inside `/app`, drop the marketing site header. Give the app its own
compact shell:
- **App bar (sticky):** small home icon (to `/`, where Home, Privacy
  and Terms live), pair switcher (avatars + names, "Switch"), and a
  prominent **heart-balance pill** that is always visible. Tapping the
  pill opens a small explainer (spendable / set aside / how you earn,
  how you spend).
- **3 tabs** ("worlds"): **Give** (compose + notes), **My wishes**
  (collect + spend), **For {partner}** (their wishes + claims you
  fulfil). A bottom tab bar on mobile, under the app bar on desktop.
  Hash-synced (`#give` default, `#mine`, `#theirs`; the legacy
  `#coupons` maps to `#mine`).
- **Colour-coded worlds:** Give = ink/neutral, My wishes = rose (heart),
  For partner = terracotta (accent). Tinted tab indicator, section
  bands, and card edges. **Sticky section headers** with an icon and
  count while scrolling.
- **Ticket-stub coupons** (perforated edge, stub with price), grouped
  by state:
  - My wishes: *Ready to claim* (affordable, glow), *In progress*
    (open claims + Coming up), *Saving up* (approved, not affordable
    yet), *Waiting for {partner}'s yes* (drafts), *Not for {partner}*
    (declined). "Add a wish" + ideas.
  - For partner: *To give* (their claims awaiting me: accept/deliver),
    *Needs your yes* (drafts), *Their wishes* (approved), Coming up.
- **Desktop (>= 56rem): 2 columns** per world — main list left; right
  column has Coming up + claims in progress.
- **Pair menu:** "New pair" wording with "(a separate notebook)"
  explanation; the switch link is always shown.
- Theme toggle + settings move into a small "⋯" menu in the app bar
  (the settings panel stays in the footer, reachable from the menu).
- Balance text shortened everywhere; the number is the hero.

## Out
Logic/data changes. Existing RPCs/stores unchanged.

## Verification
- `/app` has no `.site-nav`; the home icon links to `/`.
- The pill shows spendable hearts; tap opens the explainer with the
  set-aside number.
- Tabs switch + hash sync + reload restore; `#coupons` -> My wishes.
- My wishes groups: an affordable coupon is under "Ready to claim"; an
  unaffordable approved one under "Saving up".
- 360px: no overflow; desktop 1280px: 2 columns.

---

## Dev notes
- New: `AppBar.tsx` (home icon as a plain `<a>` to `SERVER_BASE_URL`,
  pair switcher popover, balance pill + explainer popover (`role=note`),
  and a "⋯" menu with private mode, theme, edit name, settings, and
  home/privacy/terms). `TabBar.tsx` (`readTab`/`writeTab`, hashes
  `#give` (none) / `#mine` / `#theirs`, legacy `#coupons` -> mine).
  `Section.tsx` (sticky tinted header + icon + count). `MyWishes.tsx`,
  `ForPartner.tsx` replace `CouponsView.tsx` (deleted).
- The site header is hidden on `/app` (`SiteHeader` in `src/app.tsx`).
- World colours: new tokens `--world-{give,mine,theirs}[-soft]` (rose
  / amber / sage), all >= 4.3:1 on their soft tint and >= 4.8:1 on
  bg in both themes. Amber/sage were chosen instead of accent so worlds
  don't clash with terracotta buttons.
- Tickets: `.ticket` on `CouponCard` (perforated dashed stub with CSS
  notches, price hero, "N more" when saving up). Affordable = rose stub
  + beating heart. The approved chip now says "Agreed" (not "Ready") to
  avoid clashing with "Ready to claim".
- Mobile: fixed bottom tab bar; side column (In progress + Coming up)
  shows first on the wish worlds. Desktop >= 56rem: sticky pill tab
  bar under the app bar, 2-column grid, sticky side column.
- The greeting is time-of-day ("Good evening, Anna.") on Give; the
  old "Welcome back" eyebrow is gone.
- Edit name: from the ⋯ menu -> PairBadge in `startEditing` mode.
- Switching to a wish tab refreshes coupons + claims.
- Verified on a local prod build: 13/13 (no site nav, home link, pill
  12 + explainer, grouping Ready/Saving "8 more", 360px no overflow,
  bottom tab bar, desktop 2 cols dark, sticky headers, "New pair"
  wording).
