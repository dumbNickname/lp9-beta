# PRD-36 — Wishlist UI (my list + partner's list, approve/decline)

> Status: see `PROGRESS.md`.
> Later changes: the lists now live in the Give / My wishes / For
> partner worlds (PRD-49), not a Coupons tab.

## Goal

Let partners build wishlists in `/app`: **"I'd love"** (my wishlist:
add, edit, delete drafts) and **"For {partner}"** (their wishlist:
approve or gently decline drafts, see approved).

## What shipped

- Coupon form: optional emoji, title, price stepper (clamped 1..50),
  description, and a boundaries note with the §6b guidance ("Boundaries
  can move over time... What feels good? What's a hard no?"). Create and
  edit-draft modes. Copy says the price freezes after the yes.
- Coupon card: emoji, title, price as hearts ("12 hearts"), collapsible
  boundaries note, status chip: "Waiting for {partner}" / "Waiting for
  you" / "Ready" / "Not for {partner}" / "Retired".
- Partner's list: drafts first with "Yes, I'm in" (primary) and "Not for
  me" (quiet, optional note); approved below; retire available.
  Declined coupons are hidden from the giver.
- My list: drafts waiting (edit/delete), Ready (approved, retire with
  confirm), declined (with note, delete).
- "Show retired" toggle, empty states, refresh on focus; every mutation
  re-fetches.

Out: templates (PRD-37), private flag (PRD-38), claiming (PRD-41/42).

## Decisions

- Retire and delete ask for confirmation.

## Verification

- Unit tests for the UI and data layer.
- Owner-level flow: Alice adds a draft -> Bob sees it waiting -> Bob
  approves -> Alice sees it Ready; Bob declines another -> Alice sees
  "Not for Bob" plus the note.

## Later changes

- Notes/Coupons tabs replaced by three worlds Give / My wishes / For
  partner (PRD-49); these lists live there.
