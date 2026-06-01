# prds/

This folder holds **tiny PRDs** — one user-visible behavior or
infrastructure capability per file. The Dev agent works through them
one at a time, the QA agent verifies independently, and `PROGRESS.md`
at repo root tracks status.

## Naming

`PRD-NN-short-slug.md` — globally numbered (not per phase) so the
intended order of execution is obvious from `ls`.

## Status flow

```
todo → in-progress → dev-done → qa-done → merged
```

Status is tracked in `PROGRESS.md` only. PRD files do not move; the
file's status row in `PROGRESS.md` is what changes.

## Each PRD's shape

See `PRD-template.md`. Required sections:

- **Goal** — one sentence.
- **Scope** — in / out, both explicit.
- **Touched files / new files** — lists every path the Dev agent will
  read or write.
- **Data model impact** — schema, RPCs, RLS, or "None".
- **UI behavior** — what the user sees, or "None".
- **Verification** — concrete pass/fail steps QA executes; lists
  unit tests Dev writes and the QA-side suite QA writes.
- **Open questions** — flag rather than guess. Empty section means
  no ambiguity.

After execution, agents fill:

- `## Dev notes` — Dev appends self-test results, choices the PRD
  didn't pin down.
- `## QA findings` — QA appends pass/fail per verification step.

## Decomposition rule

Future-phase PRDs are written **only when the previous phase is
`merged`**. See `PROGRESS.md` "Decomposition rule" for the full
reasoning.

## Cross-references

- `DESIGN.md` — all design decisions; the why.
- `HANDOFF.md` — the phased plan; PRDs are derived from this.
- `PROGRESS.md` — what's being built and where it stands.
- `.opencode/agent/dev.md` and `qa.md` — the agents that execute PRDs.
