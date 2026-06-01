# PRD-02 — README skeleton

## Goal

A minimal, honest `README.md` at repo root that orients a fresh visitor
(or future Dev agent) in <60 seconds: what this project is, license,
how to set up, where to look next.

## Scope

**In:**
- One-paragraph product description (placeholder `APP_NAME`).
- License + trademark stance, prominently near the top.
- "Status" line: pre-MVP, design phase, no public product yet.
- Pointer to `DESIGN.md` (decisions), `PROGRESS.md` (what's being
  built), `HANDOFF.md` (the phased plan), `prds/` (in-flight tasks).
- Local setup section:
  - Prerequisites: node 20+, pnpm 9+, git 2.30+, curl, tar.
  - `bash scripts/install-toolchain.sh` to install the rest.
  - `bash scripts/verify-toolchain.sh` to check.
- Link to a `CONTRIBUTING.md` (deferred — note as TODO).

**Out:**
- Screenshots, marketing copy, demo links — none yet.
- Detailed architecture deep-dive — that's `DESIGN.md`'s job.
- Badges (CI, coverage) — deferred until CI exists.

## Touched files / new files

- `README.md` — new.

## Data model impact

None.

## UI behavior

None.

## Verification

1. `README.md` exists at repo root.
2. License section names AGPL-3.0-or-later and links to `LICENSE`.
3. Trademark section links to `TRADEMARK.md`.
4. Setup section's commands match what's in `scripts/`.
5. Following the README from a fresh clone produces a working dev
   environment (manual check).

**Unit tests:** none (markdown content).

**QA suite:**
- Markdown lint clean (no broken internal links).
- Every file the README references actually exists.
- Setup commands copy-pasted into a fresh shell complete without error
  (run by a human, since this needs a real fresh machine).

## Open questions

- Does the owner want their name / handle in the README author/credits
  section? Unknown until name+brand resolves; defer to TODO.

## Dev notes

### What I did

- Wrote `README.md` at repo root with these sections, in order: title +
  one-paragraph product description (using `APP_NAME` placeholder),
  Status, License & brand (AGPL + trademark, prominently near the top),
  "Where to look next" pointer table, Local setup (prerequisites,
  install, verify, build/run note), Deployment (beta target +
  placeholder explanation), Credits TODO.
- Linked: `DESIGN.md`, `PROGRESS.md`, `HANDOFF.md`, `prds/`, `LICENSE`,
  `TRADEMARK.md`. Also referenced specific in-flight PRDs by path
  (PRD-06, PRD-08, PRD-09) where the README naturally points the reader
  forward (secret-scanning hook, build entrypoints, deploy workflow).
  All referenced files were verified to exist at the time of writing.
- Used `APP_NAME` as the placeholder per `DESIGN.md` §14i and
  `TRADEMARK.md`. Did not invent a real product name anywhere.
- Called out that `https://github.com/dumbNickname/lp9-beta` is the
  **beta deploy target**, and that `lp9` in that URL is a
  deferred-name placeholder, not a final product name — explicitly
  pointed at `DESIGN.md` §14i for context.
- Updated `PROGRESS.md` row for PRD-02: `todo` → `in-progress` →
  `dev-done`.

### Choices the PRD didn't pin down

- **Section ordering and depth.** PRD listed scope-in items but not an
  order. Chose: title/description first, then Status, then License &
  brand near the top (PRD called this out — "prominently near the
  top"), then navigation pointers, then setup, then deploy, then
  credits. Rationale: a fresh visitor's <60-second orientation needs
  "what is this / is it real / can I use it / where do I look /
  how do I run it" in that order.
- **Pointer style.** Chose a small markdown table for "Where to look
  next" rather than a bulleted list, because the second column ("what
  it is") is doing real work — a flat list of filenames doesn't
  communicate why each one is worth opening.
- **CONTRIBUTING.md TODO.** PRD said "link to a `CONTRIBUTING.md`
  (deferred — note as TODO)". I included it as a row in the pointer
  table marked `**TODO**` with a one-line explanation, rather than as a
  hyperlink to a non-existent file (a broken link would fail the
  README's own QA suite).
- **Author/credits TODO.** PRD §"Open questions" flagged the
  author/handle question as deferred. Added a `## Credits` section at
  the bottom with a TODO note rather than omitting it entirely, so
  there's a stable home to land that content later.
- **Build/run instructions.** Repo has no `package.json` yet (PRD-08
  hasn't run). I did not invent fake `pnpm dev` / `pnpm build`
  commands; instead the README states explicitly that these arrive
  with PRD-08 and that this section will be updated then. This keeps
  the README honest per HANDOFF and `dev.md`'s honest-reporting rule.
- **Platform caveat for `install-toolchain.sh`.** The installer calls
  `require_linux_x86_64`. I added a one-line "currently targets Linux
  x86_64; install manually otherwise" note so a macOS / arm reader
  isn't surprised. Did not modify the script.
- **Trademark section depth.** Kept it to the essential summary
  (forks must rename, nominative use OK) and pointed at
  `TRADEMARK.md` for the full notice and `DESIGN.md` §17 for the
  rationale, rather than restating either at length in the README.

### Self-verification against the PRD's Verification section

1. `README.md` exists at repo root — ✅ verified via `ls`.
2. License section names AGPL-3.0-or-later and links to `LICENSE` —
   ✅ string `AGPL-3.0-or-later` and link `[`LICENSE`](./LICENSE)` are
   both present.
3. Trademark section links to `TRADEMARK.md` — ✅ link
   `[`TRADEMARK.md`](./TRADEMARK.md)` is present in the License & brand
   section.
4. Setup section's commands match what's in `scripts/` — ✅
   `bash scripts/install-toolchain.sh` and
   `bash scripts/verify-toolchain.sh` exist and are exactly what the
   README documents; prerequisites (node 20+, pnpm 9+, git 2.30+,
   curl, tar) match `install-toolchain.sh`'s prerequisite check and
   `verify-toolchain.sh`'s `MIN_NODE` / `MIN_PNPM` / `MIN_GIT`
   constants.
5. Following the README from a fresh clone produces a working dev
   environment — **manual fresh-machine check, not self-verifiable
   by Dev.** Flagged for QA / human runner.

### For QA to watch

- **Fresh-clone smoke test.** PRD Verification step 5 and the QA suite's
  third bullet ("setup commands copy-pasted into a fresh shell complete
  without error") are not Dev-verifiable. Run on a real Linux x86_64
  machine without the project's tools pre-installed; check `gitleaks`
  and `supabase` end up on `PATH` and `verify-toolchain.sh` exits 0.
- **Markdown link validation.** Every relative link in the README
  should resolve. I verified the obvious ones (`DESIGN.md`,
  `HANDOFF.md`, `PROGRESS.md`, `LICENSE`, `TRADEMARK.md`, `prds/`,
  PRD-06/08/09 paths) exist at the time of writing — but a markdown
  linter run as part of QA's "markdown lint clean" check is the
  authoritative answer.
- **External link.** `https://github.com/dumbNickname/lp9-beta` is
  asserted to exist as the beta deploy target. I did not fetch it. If
  the repo doesn't yet exist or is private, QA should flag the README's
  claim against reality.
- **Tone of the placeholder explanation.** I tried to make it clear
  that `lp9` is a placeholder without sounding embarrassed about it.
  Worth a second pair of eyes — if it reads as evasive or as quietly
  endorsing `lp9` as a name, that's a fix.
- **No `package.json` yet.** README explicitly says "no `pnpm install`
  yet, see PRD-08." When PRD-08 lands, the "Build / run" subsection
  must be updated; QA should not flag the absence as a current bug,
  but the orchestrator should track this as a follow-up.

## QA findings

### Verification table

| # | Step | Result | Notes / reproduction |
|---|---|---|---|
| 1 | `README.md` exists at repo root | **PASS** | `ls README.md` returns the file. |
| 2 | License section names AGPL-3.0-or-later and links to `LICENSE` | **PASS** | README lines 32–37: literal string `AGPL-3.0-or-later` plus `[`LICENSE`](./LICENSE)`. Link target exists. |
| 3 | Trademark section links to `TRADEMARK.md` | **PASS** | README line 41: `[`TRADEMARK.md`](./TRADEMARK.md)`. Link target exists. |
| 4 | Setup section's commands match what's in `scripts/` | **PASS** | README quotes `bash scripts/install-toolchain.sh` and `bash scripts/verify-toolchain.sh`; both files exist with those names. Prerequisites stated in README (node 20+, pnpm 9+, git 2.30+, curl, tar) match `scripts/verify-toolchain.sh:15-17` (`MIN_NODE=20.0.0`, `MIN_PNPM=9.0.0`, `MIN_GIT=2.30.0`) and `scripts/install-toolchain.sh:28` prerequisite loop (`node pnpm git curl tar`). Verified programmatically by `tests/qa/PRD-02-readme.sh` section 2. |
| 5 | Following the README from a fresh clone produces a working dev environment | **OUT OF SCOPE** | Requires a real fresh Linux x86_64 machine without the project's tools pre-installed and a clean shell. Not verifiable in the QA agent's environment (tools already present, no clean VM). Flagged for a human runner. Not a defect; not blocking `qa-done` per the PRD's own QA-suite note that this "needs a real fresh machine". |

### QA-suite items

- **Markdown lint sanity / no broken internal links.** PASS. Every relative `[...](path)` link in `README.md` was extracted and resolved against the repo root. All 14 link targets exist (`./DESIGN.md`, `./PROGRESS.md`, `./LICENSE`, `./TRADEMARK.md`, `./HANDOFF.md`, `./prds/`). The four inline path references (`prds/PRD-08-solidstart-bootstrap.md`, `prds/PRD-09-deploy-workflow.md`, `scripts/install-toolchain.sh`, `scripts/verify-toolchain.sh`) all resolve. See `tests/qa/PRD-02-readme.sh` section 1 and 1b.
- **Every file the README references exists.** PASS (subsumed by the above).
- **Toolchain commands the README quotes match what's in `scripts/`.** PASS. README's `bash scripts/install-toolchain.sh` and `bash scripts/verify-toolchain.sh` match the files verbatim. README's prerequisite floors match the `MIN_*` constants in `scripts/verify-toolchain.sh`. README's claim that the installer installs the Supabase CLI and `gitleaks` matches `scripts/install-toolchain.sh:45-47`, which sources the two `install-*.sh` scripts.
- **Read-only smoke run of `scripts/verify-toolchain.sh`** (sanity check, not in PRD): exits 0; reports `node 24.13.0`, `pnpm 11.1.1`, `git 2.43.0`, `supabase 2.103.0` (newer upstream 2.104.0 — informational warning, not a failure), `gitleaks 8.30.1`. Confirms the verifier's exit-code contract works as the README implies.

### Dev-flagged concerns — QA reads

- **Markdown lint authority** (Dev: "a markdown linter run as part of QA's 'markdown lint clean' check is the authoritative answer"). Addressed. The adversarial script under `tests/qa/PRD-02-readme.sh` is the QA-side authoritative check; it extracts every relative-link target and tests file-existence at the resolved path. All links pass. No external markdown linter was run; the bespoke link-resolution check is more precise for this PRD's actual concern (link rot to repo paths) than a generic linter would be.
- **`lp9-beta` repo accessibility** (Dev: "I did not fetch it. If the repo doesn't yet exist or is private, QA should flag the README's claim against reality"). **Not attempted.** Verifying `https://github.com/dumbNickname/lp9-beta` is reachable requires `webfetch`, which is `ask` for the QA subagent per `.opencode/agent/qa.md:21`. The orchestrator did not pre-authorize a network fetch in this invocation, so QA did not prompt for one out-of-band. Recommended: orchestrator either confirms the repo's existence directly or amends the README to drop the URL claim until it does exist. The README's statement is plausible (matches DESIGN §16f's two-GitHub-repos pattern and `LICENSE`'s copyright holder `dumbNickname`) but unverified by QA.
- **Tone of `lp9`-is-placeholder.** QA read: acceptable. README §"Deployment" frames it factually ("a deferred-name placeholder — the same kind of placeholder as `APP_NAME` in code — and **is not a final product name**") and pins the explanation to `DESIGN.md` §14i, which is the canonical decision. It does not read as embarrassed and does not silently endorse `lp9` as a name. Not a defect.
- **PRD Verification step 5 (fresh-clone)** — **explicitly marked out of scope** for this QA invocation. The PRD's own QA-suite text concedes the step needs a real fresh machine ("run by a human, since this needs a real fresh machine"). QA agent environment has node/pnpm/git/supabase/gitleaks pre-installed and cannot simulate the cold-start path. Not blocking `qa-done`; flagged as a human follow-up for the orchestrator before merge.
- **Build/run section deferral to PRD-08.** Not a current defect. README is honest about the absence of `package.json` and pins the future content to PRD-08. The orchestrator should flag this section for re-verification when PRD-08 lands.

### Adversarial test

**Where:** `tests/qa/PRD-02-readme.sh` (executable bash script).

**What it does:** Three orthogonal checks the PRD's plain-read verification list does not cover:

1. **Link rot, mechanically.** Extracts every markdown link target of the form `](path)` from `README.md`, filters out `http(s)://` and pure anchors, strips trailing `#anchor` fragments, and tests each remaining target as a path relative to repo root. Also tests four inline (non-link) path mentions that the reader is expected to navigate to (`prds/PRD-08-...`, `prds/PRD-09-...`, `scripts/install-toolchain.sh`, `scripts/verify-toolchain.sh`).
2. **Drift between README and `scripts/verify-toolchain.sh`.** Parses `MIN_NODE` / `MIN_PNPM` / `MIN_GIT` out of `scripts/verify-toolchain.sh` and confirms the README states the same floors using the documented "X or newer" phrasing. Also confirms the README quotes the install/verify commands by exact path. If a future script bump raises a floor without updating the README, this test fails — catching the silent-drift class of bug.
3. **Secret hygiene per DESIGN §16g.** Scans the README for JWT-shaped tokens (Supabase anon/service-role key shape), Supabase project URLs (`<20-char-ref>.supabase.co`), `sk_live_` / `sk_test_` prefixes, and long token-shaped strings near the word `service_role`. README must not contain any of these.

**Result:** ALL PASS. Full output captured by running the script directly:

```
$ bash tests/qa/PRD-02-readme.sh
...
== 1. Relative links resolve ==
[ok]   link resolves: ./DESIGN.md
... (14 link checks, all ok) ...
== 1b. Inline path references ==
[ok]   inline path exists: prds/PRD-08-solidstart-bootstrap.md
... (4 inline path checks, all ok) ...
== 2. README prerequisite versions match verify-toolchain.sh ==
[ok]   README states Node.js 20+ (matches MIN_NODE=20.0.0)
[ok]   README states pnpm 9+ (matches MIN_PNPM=9.0.0)
[ok]   README states git 2.30+ (matches MIN_GIT=2.30.0)
[ok]   README quotes 'bash scripts/install-toolchain.sh' and the script exists
[ok]   README quotes 'bash scripts/verify-toolchain.sh' and the script exists
== 3. README contains no secret-shaped strings ==
[ok]   no JWT-shaped strings
[ok]   no Supabase project URLs
[ok]   no sk_live_/sk_test_ secrets
[ok]   no service_role secrets
PRD-02 adversarial checks: ALL PASS
```

**Why this set.** A README PRD's failure modes are (a) link rot between the README and the files it points at, (b) the README and source of truth (here: the toolchain scripts) silently disagreeing, and (c) accidental secret pasting. (a) directly implements the PRD's "no broken internal links" QA-suite bullet with teeth. (b) is the drift-prevention test the PRD does not call out but should — if `scripts/verify-toolchain.sh` raises `MIN_NODE` next month and nobody updates the README, a fresh user follows the README, installs node 20, and is rejected by the verifier with no obvious cause. (c) is the cheap-but-high-value §16g check that catches the worst-class mistake.

### Cross-document consistency spot-checks (beyond PRD asks)

- README §"License & brand" claim **"Both apply, independently and simultaneously"** vs. `TRADEMARK.md:27` **"Both apply simultaneously and independently"** — semantically identical phrasing. No contradiction.
- README claim **"forks must do (rename before redistributing)"** is a one-clause summary of `TRADEMARK.md:31-33`, which actually requires rename "before redistributing **or running it as a network-accessible service**." The README's summary drops the second half. Reader is one click away from the full notice via the adjacent `[TRADEMARK.md](./TRADEMARK.md)` link. **Not a defect** — README is explicitly a summary; the full notice is canonical. Noted as a possible polish item for a future pass if the orchestrator wants the README to be defensively complete on its own.
- README §"License & brand" framing **"AGPL §13 network-use clause closes the SaaS loophole"** matches `DESIGN.md` §17b's rationale text verbatim in spirit. No contradiction.
- README §"Status" enumeration of repo contents ("design documents, license + trademark notices, the phased implementation plan, individual PRDs for the work in flight, and the toolchain installer") omits `.opencode/agent/*` (Dev/QA subagent definitions, which exist per `PROGRESS.md` PRD-04/05 status `dev-done`). Reading the README, a fresh visitor would not learn the subagent system is part of the repo until they wander into `.opencode/`. Minor; the omission is consistent with the README's intentional "<60 seconds orientation" scope. **Not a defect.**
- README does not claim PRD-04 or PRD-05 status, and the Status section is honest about the project being pre-MVP. No overpromise.

### Defects found

**None.** No verification step that QA could run failed, and the adversarial script revealed no real bug. The Dev-flagged unverified items (fresh-clone smoke, `lp9-beta` external repo reachability) are noted above and handed to the orchestrator / human runner.

### Decision

All verification steps QA can run pass. Adversarial test passes. No defects. **Moving PRD-02 from `dev-done` to `qa-done`** in `PROGRESS.md`. Two follow-ups noted but not blocking: (1) human fresh-clone smoke test before final merge; (2) orchestrator confirms `github.com/dumbNickname/lp9-beta` exists (QA did not use `webfetch`).

