# IDEAS.md — backlog of ideas and TODOs for later

> Parking lot. Not decisions. Promote an item into a PRD (and
> `DESIGN.md` if it changes a decision) before building it. Newest
> first within each section. Keep entries short.

## Owner actions

- Look at the new design (PRD-32) on a real phone, light + dark. Veto or
  tune freely; tokens live in `src/styles/tokens.css`.
- Supabase free tier pauses after about a week idle. Consider a weekly
  keep-alive ping (GH Actions cron hitting `/auth/v1/health`) during beta.
- Branch protection on `master` is still unset.
- Pick the final app name (blocks Phase 9).

## Product / UX

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
