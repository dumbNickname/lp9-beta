# PRD-40 — Highlight coupons I can afford

## Goal
On my own "I'd love" list, approved coupons whose price <= my spendable
balance are visibly highlighted ("You can claim this"), so saving up
feels tangible. Owner request 2026-09-29.

## Scope
In: `CouponCard` gets an `affordable` prop, which sets the class
`coupon--affordable` (rose edge + soft glow) and a chip "You have enough".
Only on my approved coupons; never on the partner's list (no scoreboard).
Out: progress bars (anti-pattern, PRD-32).

## Verification
Balance 8: my approved 8-heart coupon highlighted, a 10-heart one not;
drafts/partner coupons never highlighted.
