# PRD-37 — Starter coupon templates (empty-wishlist picker)

> Tiny PRD per `DESIGN.md` §16b.

## Goal

When "I'd love" is empty (or via an "Ideas" button), offer gentle
archetype templates (§6c) the user can tick and add as drafts in one tap.

## Scope

**In:** `src/data/coupon-templates.ts` (typed, keyed; about 8 per
archetype: getting_to_know / established_couple / close_friends), with
the relationship's archetype preselected and the others browsable. Each
template has a key, emoji, title, suggested price, and optional
boundaries hint. Tone gentle, nothing spicy, culturally broad. Adds via
`submit_coupon` with `template_key`. Duplicates (same `template_key`
already in my list) are hidden.
**Out:** i18n (Phase 7; keep strings in one file).
