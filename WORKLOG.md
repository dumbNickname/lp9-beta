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
- QA pass on these changes; stylesheet dedupe.

## Session: used invite links, push check

**Brief:** reopening a used invite link should land in the app; check
the owner's push setup; confirm the PRD-54 fix.

- Used invite + already paired -> back to the pair (DESIGN §4
  amendment). Live E2E first still showed the error: RPC errors are
  plain objects, so the "already used" text was never read. Fixed with
  a shared data-layer helper; regression test with the real error shape.
- A claims test had a hard-coded date that went stale; now relative.
- Push: server side verified live (trigger -> `notify` -> push sent).
  Web build lacked the public key: the repo secret was named
  `VAPID_PUBLIC_KEY`, the workflow read `VITE_VAPID_PUBLIC_KEY`. The
  workflow now accepts either; owner guide updated.
- PRD-54 re-probed live: relationship UPDATE (archive, member swap,
  blob overwrite) changes 0 rows; outsider reads 0 rows; helpers denied.
- Working title `lp9` now shown everywhere (README, app header, page
  titles, home-screen name via manifest); owner found "APP_NAME" looked
  like a broken template.

## Session: iOS install + camera

- Install hint no longer names Safari: Chrome/Edge on iOS 16.4+ also
  add to home screen via Share.
- Owner: camera failed in the installed iOS app (worked in browser).
  The scanner starts the camera without a tap and had no retry. Now a
  failed start shows "Allow camera" (retry from a tap) plus, on iOS,
  where to re-enable it (Settings -> Apps -> Safari -> Camera). Owner
  to verify on device.

## Session: architecture + security review loops

**Brief:** review the code for architecture/UX debt and security gaps,
fix in loops, then merge, deploy migrations and run E2E.

- **Code:** stores drop stale responses by request sequence (not just
  pair id) and reset error/loading flags; one focus-refresh helper; all
  browser storage through one wrapper; Reset account wipes keys listed
  by their owning modules; pairing poll can't overlap; "invite already
  used" detected by error code; pure claim/date/relationship helpers;
  icons in one module; heart-note timer only inside the edit window;
  dead CSS duplicates removed.
- **Security (PRD-55):** RPCs signed-in only; no direct invite inserts;
  profile writes limited to name/locale/theme; push endpoints limited
  to real push services, 10 devices per user.
- Push can't be E2E-tested headless (Chromium refuses the subscription);
  owner tests on devices.

## Session: either partner marks done

**Brief:** the wisher should also be able to finish a claim; trust is
key. Asked whether there is history of completed items.

- **Owner answers:** either side marks done; copy "We did it" / "Done";
  history stays as is (Past claims / Given before, last 20 each).
- **Done (PRD-56):** `deliver_claim` open to both members, records
  `delivered_by`, push goes to the other partner.
- **Owner look:** accepted claim on the wisher's side now has "We did
  it"; Details show who marked it.
