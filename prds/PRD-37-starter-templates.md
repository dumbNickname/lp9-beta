# PRD-37 — Starter coupon templates (empty-wishlist picker)

> Status: see `PROGRESS.md`.

## Goal

When "I'd love" is empty (or via a "Need ideas?" button), offer gentle
archetype templates (§6c) the user can tick and add as drafts in one tap.

## What shipped

- Hardcoded, typed template set (DESIGN §6c): 8 per archetype
  (getting_to_know / established_couple / close_friends). Each has a
  key, emoji, title, suggested price (3..40) and optional boundaries
  hint. Tone gentle, nothing spicy, culturally broad.
- Picker shows when "I'd love" has no active coupons, or on request. The
  relationship's archetype is preselected; others browsable.
- Adds sequentially via `submit_coupon` with `template_key`; templates
  whose key is already in my list are hidden.
- Emoji here are product content (the coupon `emoji` field), not UI
  decoration.

Out: i18n (Phase 7; strings kept in one place).

## Verification

- Unit/UI tests; part of the wishlist flow smoke.

## Later changes

- Wishlists now live in the My wishes world (PRD-49).
