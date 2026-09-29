# PRD-44 — In-app confirm sheet (replace window.confirm)

## Goal
Replace the browser pop-ups for claim / retire / delete / reset with a
warm in-app bottom sheet (centered dialog on wide screens).

## Scope
`src/components/ConfirmSheet.tsx`: `confirmSheet(opts) => Promise<bool>`
plus a `<ConfirmHost />` mounted once in `routes/app.tsx`.
`role="alertdialog"`, `aria-modal`, focus on the confirm button, Escape
or backdrop = cancel, focus restored afterwards, a `danger` tone. Falls
back to `window.confirm` when no host is mounted (tests/early boot).

## Dev notes
- Rendered via `Portal`, so tests must use `screen` queries, not
  render-scoped ones.
- The claim sheet says "8 hearts are set aside until Ben delivers — and
  returned if it doesn't happen."
