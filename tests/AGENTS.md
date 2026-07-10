# tests/AGENTS.md

## Purpose

Test suites. Dev unit tests prove the happy path; QA adversarial suites
prove the edge cases the implementer wasn't thinking about.

## Ownership

- `tests/unit/` — Dev-written unit/component tests (Vitest +
  `@solidjs/testing-library`).
- `tests/qa/` — QA-written adversarial tests. QA is read-only on
  production code and may only write here.

## Local Contracts

- **Runner:** Vitest (`vitest.config.ts` at root, jsdom env,
  `~` alias, `vitest.setup.ts` loads jest-dom matchers). Run via
  `pnpm test`.
- **Pure logic** (e.g. `src/lib/theme.ts`) gets plain unit tests;
  route/components get render smoke tests.
- **QA gotcha:** gitleaks default rules apply an entropy filter — use
  high-entropy strings in secret-leak adversarial tests, or nothing
  trips and the test gives false confidence.
- Some QA suites are shell scripts (`tests/qa/*.sh`) for
  infra/doc-shaped PRDs.

## Work Guidance

- Test the contract from `DESIGN.md`, not the implementation's incidental
  choices — QA starts cold from the PRD (`DESIGN.md` §16c).

## Verification

- `pnpm test` runs the Vitest suites and must be green before a code PRD
  is `dev-done`.

## Child DOX Index

- None.
