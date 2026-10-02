# PRD-05 — QA subagent definition

> Status: see `PROGRESS.md`.

## Goal

Define an independent QA subagent that verifies a Dev-completed PRD
against its Verification section, writes adversarial tests, and reports
findings without touching production code.

## What shipped

- QA role definition in `.opencode/agent/`.
- Trigger: orchestrator invocation after a PRD is `dev-done`.
- Required reads: the PRD (incl. `## Dev notes`), `DESIGN.md`, Dev's diff,
  affected source files.
- Tools: read, bash, grep, glob. Writes allowed only under `tests/qa/` and
  for appending `## QA findings` to the PRD.
- Forbidden: editing app source, migrations, scripts, agent definitions or
  any other production path. Bash may run tests and the Supabase CLI
  against **dev** only, never `prod`.
- Required behaviour: run every Verification step with pass/fail; add at
  least one adversarial test beyond the list (RLS bypass, time-window
  edge, encryption boundary, GDPR cascade, whichever applies); document
  failures with repro steps; set `qa-done` only on a full pass, else leave
  `dev-done`.
- Out: the Dev role (PRD-04); any feature work.

## Decisions

- Allowed/forbidden lists follow `DESIGN.md` §16c.
- Frontmatter and tool allow-list follow opencode's subagent API via the
  `customize-opencode` skill, as in PRD-04.

## Verification

- Role file loads cleanly; lists are explicit.
- Smoke: QA on a trivial dev-done PRD reports findings, leaves source
  untouched, updates `PROGRESS.md` only on full pass.
- Adversarial: a PRD missing a check the design requires gets flagged for
  amendment; broken Dev code is reported (stays `dev-done`), never fixed
  by QA.
