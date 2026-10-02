# PRD-46 — "New since last visit" + things-waiting badge

> Status: see `PROGRESS.md`.

## Goal
Without email, make it obvious what changed: received notes since your
last visit get a "new" tag + soft ring, and the coupons area shows a
count of things waiting on you (drafts to approve + claims to answer or
deliver).

## What shipped
- Per-relationship last-seen timestamp in localStorage
  (`last_seen:<relId>`).
- The baseline is captured once per app load, so items stay "new" while
  you read. The first visit marks nothing. Reset device clears it.
- A waiting-count badge on the tab; coupons load on dashboard mount so
  the count is ready without opening the tab.

## Decisions
- Device-local only, no server read receipts: avoids pressure on the
  sender (see IDEAS).

## Verification
- Unit tests for baseline capture and first-visit behaviour.

## Later changes
- Notes/Coupons tabs replaced by the three worlds (PRD-49); the badge
  lives on the worlds tab bar.
