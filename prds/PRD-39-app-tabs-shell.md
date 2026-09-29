# PRD-39 — App tabs (Notes / Coupons) shell

> Tiny PRD per `DESIGN.md` §16b.

## Goal

Split the paired app into two tabs with a bottom-anchored mobile tab bar
(top on wide screens). The pair badge + privacy toggle live in a shared
app header. Prerequisite for PRD-36.

## Scope

**In:** tab state synced to `location.hash` (`#notes` / `#coupons`),
because GH Pages serves `/app` only (D-39.1). No new prerender routes;
the `#pair=` deep link must keep working (pair handling runs before tabs
exist). Keyboard + `aria-selected` tabs pattern. Balance shows on both
tabs.
