# PRD-NN — Title

> Tiny PRD per `DESIGN.md` §16b. Dev agent reads this top-to-bottom,
> implements, runs the unit tests in §Verification, then hands off
> to QA.
>
> **Ambiguity rule (DESIGN §16b):** if anything below is unclear,
> STOP and load the `grill-me` skill rather than guessing. Guesses
> pollute the design history.

## Goal

One sentence. The user-visible behavior or infrastructure capability
this PRD delivers.

## Scope

**In:**
- bullet list of what this PRD covers

**Out:**
- bullet list of what this PRD explicitly does NOT cover (and where it
  will be covered, if known)

## Touched files / new files

- `path/to/file` — what changes
- `path/to/new-file` — created

## Data model impact

- Schema changes: yes / no — if yes, list migration file(s)
- New RPCs: list with signatures
- RLS changes: list affected tables/policies
- (or: "None" if pure frontend / tooling)

## UI behavior

What the user sees/does. Skip if non-UI PRD.

## Verification

Concrete steps. Pass/fail-able by QA without reading code.

1. ...
2. ...

**Unit tests (Dev writes & runs):**
- `tests/unit/...` covers ...

**QA suite (QA writes & runs):**
- adversarial / edge / integration scenarios

## Open questions

Use this section for anything you decided to flag rather than assume.
Empty section = no ambiguity at PRD-write time.

---

## Dev notes

(Filled in by Dev agent. Self-test results, rationale for choices the
PRD didn't pin down, anything QA should be aware of.)

## QA findings

(Filled in by QA agent. Pass/fail per verification step + adversarial
results.)
