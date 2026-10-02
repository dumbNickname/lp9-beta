# tests/AGENTS.md

## Purpose

Unit tests prove the happy path; QA adversarial suites prove the edges
the implementer missed.

## Ownership

- Unit suites: written by Dev.
- QA suites: written by QA, who is read-only on production code.

## Local Contracts

- Vitest in jsdom with jest-dom matchers; run via `pnpm test`.
- Pure logic gets plain unit tests; components get render tests.
- Secret-leak tests need high-entropy strings (gitleaks entropy filter).
- Some QA checks for doc/infra PRDs are shell scripts.

## Work Guidance

- Test the `DESIGN.md` contract, not incidental implementation (§16c).
- Intentional UI changes update the old tests in the same commit.
- Every bug found in E2E gets a regression test.
- Keys read back from IndexedDB are clones: compare by encrypt/decrypt
  round-trip, not identity.

## Verification

- `pnpm test` green before a PRD is `dev-done`.

## Child DOX Index

- None.
