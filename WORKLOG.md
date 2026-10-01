# WORKLOG — autonomous design/UX session

Owner brief: review code; fix the invite-link experience (redirect loop,
unclear outcome); review privacy mode; make the app look and feel
stronger (visual over text, mobile first); add a "how it works" guide
near settings; pick a gadget. Commit + push each task; verify live.

Owner answers (before leaving):
- Push each finished task to `master` (CI deploys), verify on live.
- Tasteful motion is OK (heart burst, paired moment, illustrated empty
  states). Still no scoreboards / comparisons.
- Privacy mode: one quick toggle; OFF by default, but discoverable;
  when ON, tapping a hidden item asks to reveal it or turn the mode off.
- Gadget: agent picks.

Decisions are listed per task below (newest last). Product-rule changes
are also recorded as dated amendments in `DESIGN.md`.

## T1 — Invite link flow

Findings (reproduced with Playwright on the live site, two anon
contexts):
- Joiner opens link -> onboarding -> after "Continue" lands on the
  generic "Pair with your partner" landing; the invite is gone.
  Cause: `refreshProfile()` / `refreshRelationship()` set `*Loading`
  on every refresh, and `routes/app.tsx` shows "Loading..." while
  loading, unmounting the subtree. `PairFlow` had already consumed and
  stripped `#pair=`, so the remount started fresh. The same bug
  remounted the whole Dashboard on every tab focus (lost scroll,
  half-typed notes).
- An already-paired user opening an invite link: link silently ignored.
- No clear end state: joiner/inviter are dropped into the dashboard
  with a recovery-password form on top; no "you are paired" moment.

Decisions:
- Loading flags only cover the first load of each store; later
  refreshes update data in place (no unmount).
- The invite payload is captured once at app start into an in-memory
  `pendingJoin` signal (`lib/pairing/pendingJoin.ts`) and the fragment
  is stripped. It survives onboarding and remounts; cleared on join or
  cancel. Not persisted (the key must not linger in storage).
- Onboarding shows who invited you when arriving via a link.
- Already-paired user + invite link -> opens the "new pair" flow on the
  confirm step automatically.
- Both sides get a full-screen "paired" moment (two avatars meeting in
  a heart) before the dashboard; the recovery prompt comes after it.
