# PRD-04 — Dev subagent definition

## Goal

Create `.opencode/agent/dev.md` so the orchestrator can hand a single
PRD to a Dev subagent that has the right tools, the right read context,
and clear constraints (no scope creep, no unilateral PRD sign-off).

## Scope

**In:**
- `.opencode/agent/dev.md` describing:
  - Trigger: explicit invocation by the orchestrator with one PRD path.
  - Required reads on every invocation: the PRD, `DESIGN.md`,
    `PROGRESS.md`, the files the PRD's "Touched files" section names.
  - Allowed tools: `read`, `edit`, `write`, `bash`, `grep`, `glob`.
    `bash` may run pnpm + supabase CLI commands targeting the **dev**
    Supabase project only.
  - Forbidden: editing files outside the PRD's stated scope; running
    migrations against `prod`; marking the PRD `qa-done` or `merged`
    in `PROGRESS.md`.
  - Required behaviors:
    - On any PRD ambiguity, load the `grill-me` skill and stop.
    - Apply the `pragmatic` skill while writing code.
    - Write unit tests for the feature; run them; report pass/fail.
    - Append a `## Dev notes` section to the PRD on completion.
    - Update `PROGRESS.md` row for this PRD to `dev-done` (and only
      to `dev-done`).

**Out:**
- The QA subagent (PRD-05).
- Any actual feature work — this PRD only defines the role.

## Touched files / new files

- `.opencode/agent/dev.md` — new.

## Data model impact

None.

## UI behavior

None.

## Verification

1. `.opencode/agent/dev.md` exists.
2. File can be loaded by opencode without a syntax error.
3. The agent's instructions explicitly cover: required reads, allowed
   tools, forbidden actions, ambiguity rule, completion handoff.
4. Smoke test: orchestrator invokes the Dev agent on a trivial test
   PRD (e.g. "add `# hi` to a scratch file"); agent reads, edits,
   reports `dev-done`, does not edit anything else.

**Unit tests:** N/A (config file).

**QA suite:**
- Adversarial: orchestrator hands the Dev agent a PRD that says "edit
  file X"; agent should NOT also edit unrelated file Y, NOT touch
  `PROGRESS.md` beyond its row, NOT run anything against `prod`.
- Ambiguity: orchestrator hands a deliberately vague PRD; Dev agent
  must invoke `grill-me`, not improvise.

## Open questions

- Frontmatter format and tool allow-list specifics depend on opencode's
  current subagent API. Dev agent should consult `customize-opencode`
  skill at PRD-execution time rather than guessing.
