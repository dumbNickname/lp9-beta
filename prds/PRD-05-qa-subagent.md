# PRD-05 — QA subagent definition

## Goal

Create `.opencode/agent/qa.md` for an independent QA subagent that
verifies a Dev-completed PRD against its `Verification` section,
writes adversarial tests, and reports findings without modifying the
production code.

## Scope

**In:**
- `.opencode/agent/qa.md` describing:
  - Trigger: orchestrator invocation **after** a PRD is `dev-done`.
  - Required reads: the PRD (including `## Dev notes`), `DESIGN.md`,
    the diff Dev produced, the affected source files.
  - Allowed tools: `read`, `bash`, `grep`, `glob`. **Write** is
    allowed only under `tests/qa/` and for appending the
    `## QA findings` section to the PRD.
  - **Forbidden: editing files under `src/`, `supabase/migrations/`,
    `scripts/`, `.opencode/`, or any other production code path.**
  - `bash` may run pnpm test commands and supabase CLI against the
    **dev** project. Never `prod`.
  - Required behaviors:
    - Execute every step in the PRD's `Verification` section,
      reporting pass/fail per step.
    - Author **at least one adversarial test** beyond the PRD's
      verification list (RLS bypass / time-window edge / encryption
      boundary / GDPR cascade — whichever applies).
    - Append `## QA findings` with results + reproduction steps for
      any failure.
    - Update `PROGRESS.md` row to `qa-done` only if all checks pass;
      otherwise leave at `dev-done` and document the failure.

**Out:**
- The Dev subagent (PRD-04).
- Any feature work.

## Touched files / new files

- `.opencode/agent/qa.md` — new.
- `tests/qa/` directory created when the first QA test lands (not
  scaffolded by this PRD).

## Data model impact

None.

## UI behavior

None.

## Verification

1. `.opencode/agent/qa.md` exists.
2. File loads cleanly in opencode.
3. Allowed/forbidden lists are explicit and consistent with §16c.
4. Smoke test: orchestrator invokes QA against a trivial dev-done
   PRD; QA reports findings, does NOT modify `src/`, updates
   `PROGRESS.md` only on full pass.

**Unit tests:** N/A.

**QA suite:**
- Adversarial: orchestrator gives QA a PRD whose verification section
  is missing a check the design clearly requires (e.g. RLS test for
  a table-touching PRD); QA should flag the gap and ask the
  orchestrator to amend the PRD before proceeding.
- Adversarial: orchestrator points QA at a PRD with broken Dev code;
  QA must report `dev-done` remains, with reproducible failure steps,
  and **not** "fix" the code itself.

## Open questions

- Same as PRD-04 — frontmatter / tool allow-list specifics defer to
  the `customize-opencode` skill at execution time.
