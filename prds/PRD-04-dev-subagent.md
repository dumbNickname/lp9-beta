# PRD-04 — Dev subagent definition

> Status: see `PROGRESS.md`.

## Goal

Define a Dev subagent role so the orchestrator can hand it a single PRD
with the right tools, the right read context and clear limits (no scope
creep, no self sign-off).

## What shipped

- Dev role definition in `.opencode/agent/`.
- Trigger: explicit orchestrator invocation with one PRD path.
- Required reads each run: the PRD, `DESIGN.md`, `PROGRESS.md`, and the
  files in the PRD's scope.
- Tools: read, edit, write, bash, grep, glob. Bash may run pnpm and the
  Supabase CLI against the **dev** project only.
- Forbidden: edits outside the PRD's scope; anything against `prod`;
  marking a PRD `qa-done` or `merged`.
- Required behaviour: on ambiguity load `grill-me` and stop; apply
  `pragmatic`; write and run unit tests and report results; append
  `## Dev notes` to the PRD; set the PRD's `PROGRESS.md` row to
  `dev-done` and nothing else.
- Out: the QA role (PRD-05); any feature work.

## Decisions

- Frontmatter and tool allow-list follow opencode's current subagent API,
  checked via the `customize-opencode` skill at build time, not guessed.

## Verification

- Role file loads in opencode without error and covers required reads,
  tools, forbidden actions, ambiguity rule and handoff.
- Smoke: a trivial test PRD is done, reported `dev-done`, nothing else
  touched.
- Adversarial: no edits to unrelated files, no `PROGRESS.md` edits beyond
  its row, nothing against `prod`; a vague PRD triggers `grill-me`.

## Later changes

- Workflow: solo-owner practice commits small changes straight to
  `master` (branches + PRs once branch protection is on).
