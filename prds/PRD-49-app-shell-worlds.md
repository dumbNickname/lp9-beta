# PRD-49 — App shell redesign: app bar, 3 worlds, ticket coupons

> Status: see `PROGRESS.md`.

## Goal
Owner direction 2026-09-29 (grilled, all recommended picks + home
icon): inside `/app`, drop the marketing site header and give the app
its own compact shell organised as three colour-coded "worlds".

## What shipped
- **No site header in `/app`.** A sticky app bar: home icon (to `/`,
  where Home, Privacy and Terms live), pair switcher (avatars + names,
  "Switch"), and an always-visible **heart-balance pill**. Tapping the
  pill opens an explainer (spendable / set aside / how you earn and
  spend). Balance text is short; the number is the hero.
- **"⋯" menu** in the app bar: private mode, theme, edit name,
  settings, home/privacy/terms.
- **Three worlds (tabs):** **Give** (compose + notes), **My wishes**
  (collect + spend), **For {partner}** (their wishes + claims you
  fulfil). Fixed bottom tab bar on mobile; sticky pill tab bar under
  the app bar on desktop. Hash-synced: `#give` (default, no hash),
  `#mine`, `#theirs`; legacy `#coupons` maps to `#mine`.
- **World colours:** Give = rose, My wishes = amber, For partner =
  sage; tinted tab indicator, section bands, card edges. All meet
  >= 4.3:1 on their soft tint and >= 4.8:1 on bg in both themes.
- **Sticky section headers** with icon and count while scrolling.
- **Ticket-stub coupons** (perforated edge, price stub), grouped by
  state:
  - My wishes: *Ready to claim* (affordable, glow + beating heart),
    *In progress* (open claims + Coming up), *Saving up* (approved, not
    affordable yet), *Waiting for {partner}'s yes* (drafts), *Not for
    {partner}* (declined). "Add a wish" + ideas.
  - For partner: *To give* (their claims awaiting me: accept/deliver),
    *Needs your yes* (drafts), *Their wishes* (approved), Coming up.
- **Desktop (>= 56rem): 2 columns** per world — main list left, sticky
  side column with Coming up + claims in progress. On mobile the side
  column shows first on the wish worlds.
- Pair menu says "New pair" with "(a separate notebook)"; the switch
  link is always shown.
- Give greets by time of day ("Good evening, Anna.").
- Switching to a wish world refreshes coupons + claims.
- Out: logic/data changes; existing RPCs and stores unchanged.

## Decisions
- Amber/sage instead of the PRD's ink/rose/terracotta, so worlds don't
  clash with terracotta buttons.
- The approved chip says "Agreed" (not "Ready") to avoid clashing with
  "Ready to claim".
- Worlds are hash views inside one route, no new prerender routes
  (D-39.1).

## Verification
- Unit tests: default Give, world switching + hash sync, legacy
  `#coupons`, balance pill explainer, path kept under `<base href>`.
- Local prod build: no site nav, home link, pill + explainer, grouping
  (Ready / Saving up), 360px no overflow, bottom tab bar, desktop 2
  columns (dark), sticky headers, "New pair" wording.

## Later changes
- Layering, column alignment, claim chips, ticket notches removed and
  "N more" moved next to the status chip (PRD-50).
- Settings became its own page `#settings` (PRD-51); a visual "How it
  works" page `#guide` was added. Theme moved to Settings.
- Mobile app bar is 2 rows since 2026-10-01 (pair name + eye + more;
  full-width heart wallet strip); home icon only in the menu on mobile;
  desktop stays one row.
- Private mode is an eye toggle in the app bar, OFF by default and
  remembered per device (DESIGN §15c amended 2026-10-01).
- Line icons replace text/emoji glyphs in UI; tasteful motion allowed
  (owner 2026-10-01).
- The "I'd love" / "For partner" lists (PRD-36) live in these worlds;
  dashboard remounts only on pair id change.
