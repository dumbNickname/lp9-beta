# PRD-46 — "New since last visit" + things-waiting badge

## Goal
Without email, make it obvious what changed: received notes since your
last visit get a "new" tag + soft ring, and the Coupons tab shows a
count of things waiting on you (drafts to approve + claims to answer or
deliver).

## Scope
`src/lib/lastSeen.ts`: a per-relationship `last_seen:<relId>` in
localStorage. The baseline is captured once per app load, so items stay
"new" while you read. The first visit marks nothing. Reset clears it.
The badge count lives in `Dashboard.tsx` (coupons are now loaded on
dashboard mount, not only on the tab).

## Dev notes
- Device-local only, no server read receipts (avoids pressure on the
  sender; see IDEAS).
