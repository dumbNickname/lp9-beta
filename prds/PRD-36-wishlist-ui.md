# PRD-36 — Wishlist UI (my list + partner's list, approve/decline)

> Tiny PRD per `DESIGN.md` §16b.

## Goal

A "Coupons" area in `/app` with two lists: **"I'd love"** (my wishlist:
add, edit and delete drafts) and **"For {partner}"** (their wishlist:
approve / gently decline drafts, see approved).

## Scope

**In:**
- App sub-navigation inside `/app`: tabs "Notes" (current dashboard) and
  "Coupons". Client-side state or `/app/coupons` route (Dev chooses;
  must survive GH Pages 404 fallback).
- `CouponForm`: emoji (optional, short text input), title, price
  (1–50, number stepper), description, boundaries note with the §6b
  guidance text ("Boundaries can move over time... What feels good?
  What's a hard no?"). Create + edit-draft modes.
- `CouponCard`: emoji, title, price as hearts count ("12 hearts"),
  status chip (Waiting for {partner} / Ready / Not for {partner} /
  Retired), boundaries note collapsible.
- Partner list: drafts first with "Yes, I'm in" (primary) and "Not for
  me" (quiet; optional note). Approved list below.
- My list: "Waiting for {partner}" drafts (edit/delete), "Ready"
  approved, declined (with note + delete). Retire action on approved
  (confirm).
- Empty states. Focus refresh.

**Out:** templates (PRD-37), private flag (PRD-38), claiming (Phase 5).

## Verification

Owner-level: Alice adds a draft -> Bob sees it waiting -> Bob approves ->
Alice sees it Ready. Bob declines another -> Alice sees "Not for Bob" +
note.

---

## Dev notes

- `CouponsView.tsx` has two sections: "{partner} would love" (their
  list; approve / "Not for me" with optional note / retire) and "I'd
  love" (mine; add/edit/delete drafts, retire approved). Declined
  coupons are hidden from the giver's view. A "Show retired" toggle is
  offered.
- `CouponForm.tsx`: emoji, title, price stepper (clamped 1–50), and the
  description + boundaries textareas with the §6b guidance copy. Says
  the price freezes after the yes.
- `CouponCard.tsx`: status chips ("Waiting for Bob" / "Waiting for you"
  / "Ready" / "Not for Bob" / "Retired"). Retire and delete confirm via
  `window.confirm`.
- Store `src/lib/stores/coupons.ts`: every mutation re-fetches.
- Tests: `tests/unit/coupons-ui.test.tsx`, `tests/unit/coupons-data.test.ts`.
