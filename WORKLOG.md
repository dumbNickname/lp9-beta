# WORKLOG

Log of autonomous work sessions: owner brief, findings, decisions, what
to look at. Product rules live in `DESIGN.md`; open agent choices in
`no-human-decisions.md`.

## Session: design + UX pass

**Brief:** fix the looping invite-link experience; review privacy mode;
stronger visuals with less text, mobile first; a "how it works" guide;
pick a gadget. Push each task and verify live.

**Owner answers:** push per task; tasteful motion OK; privacy mode off
by default, one quick toggle, tap a hidden item to reveal or turn off;
agent picks the gadget; mobile header = two rows with a wallet strip.

### Invite link
- **Found:** a new user opening a link went through onboarding and then
  landed on the generic pairing screen with the invite gone. Every
  refresh briefly showed "Loading", which unmounted the screen, and the
  link had already been stripped from the URL. The same bug wiped
  half-typed notes on tab focus. Links opened by an already-paired user
  were ignored, and nobody got a clear "you're paired" moment.
- **Done:** the invite is held in memory from app start until join or
  cancel; loading only gates the first load; onboarding shows "Alice
  is waiting for you" and pairs in one tap; already-paired users land
  in the new-pair flow; both phones get a full-screen paired moment.

### Inviter's comments locked after pairing
- **Found:** the inviter sends the link from a chat app, so the app tab
  is in the background and its pairing poll is frozen. On return a
  refresh finds the new pair first and the key never moves to it, so
  the composer asked for a recovery password that didn't exist.
- **Done:** any refresh that finds the new pair adopts the waiting key
  (only for a pair this user created as inviter, after the invite, with
  no key yet) and shows the paired moment.

### Privacy mode
- **Found:** three toggles; on at every launch, so each open hid
  everything; the hidden-wish row offered a permanent "Unmark".
- **Done:** off by default, remembered per device; one eye in the app
  bar; veiled items ask "show this one / turn off / keep hidden";
  one-time hint under the eye once notes exist (`DESIGN.md` §15c).

### Visuals
- Onboarding: floating hearts, one big name field, relationship chips.
- Pairing: Invite/Join as two big tiles, native "Send link", a broken-
  link visual for a dead invite with "invite them instead".
- Recovery prompt: two icon facts; the full honest text folded away.
- Give: icon tabs, "Send 3 hearts" button with a heart burst,
  illustrated empty states.
- How it works: four colour-coded cards with tiny mock-ups and "take me
  there", in the more menu above Settings.
- Gadget: memory jar. Partner notes drop in as hearts; tap for a random
  past note. Shows fullness, never a count.
- Mobile app bar: two rows. The pair name gets the full width (home
  moved to the menu); the balance is a full-width wallet strip whose
  heart pulses when hearts arrive. Desktop unchanged.

### Caught by browser tests
- The privacy hint covered the more menu, Back and the heart picker;
  it now sits in the page flow and shows only on Give.
- A type error passed unit tests and failed CI; typecheck now runs
  before every push.

### For the owner to look at
- The paired moment on both phones; onboarding via a link.
- Heart burst on send; balance pulse when hearts arrive.
- The memory jar; the How it works page.
- Eye + tap-to-reveal; the mobile header with a long partner name.
- All of the above in dark theme.

### Left for later
- QA pass on these changes; PRD-54 security fix; stylesheet dedupe.
