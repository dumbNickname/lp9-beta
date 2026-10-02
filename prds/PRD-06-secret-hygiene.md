# PRD-06 — `.gitignore` + `.env.example` + gitleaks pre-commit

> Status: see `PROGRESS.md`.

## Goal

Make committing secrets impossible in normal flow: gitignore real secret
files, ship a documented `.env.example`, and run gitleaks as a pre-commit
hook that fails the commit on a hit.

## What shipped

- `.gitignore`: dependencies, build outputs, `.env`, `.env.local`,
  `.env.*.local`, IDE and OS clutter, Jupyter checkpoints, aider files.
- `.env.example` documents every variable with empty placeholders; only
  public `VITE_` values (Supabase URL and publishable/anon key, RLS-bound).
  No Supabase access token or DB password needed (`DESIGN.md` §16e).
- `.gitleaks.toml`: gitleaks default ruleset plus path allowlists for
  `LICENSE` (AGPL text can false-positive) and `.env.example`
  (placeholders only).
- Pre-commit hook, installed by a git-hooks installer that the toolchain
  installer calls: `gitleaks protect --staged --redact` with the project
  config.
- Out: CI-side gitleaks scan (PRD-09 deploy workflow); separate rotation
  runbook (lives in `DESIGN.md` §16g).

## Decisions

- `--no-verify` bypass stays possible as an intentional, documented escape
  hatch; blocking it would be too hostile.

## Verification

- `.env` stays untracked; hook installs executable and runs gitleaks.
- A staged high-entropy fake token is rejected; normal content,
  `.env.example` and `LICENSE` pass.
- Force-added `.env` with a token is still caught by gitleaks.

## Gotchas

- gitleaks default rules apply an entropy filter: low-entropy fakes (e.g.
  `ghp_aaaa...`) do not trip it. Adversarial tests need realistic
  high-entropy strings, or "no leaks" gives false confidence.
- Staged scans print "0 commits scanned"; expected, the staged diff is
  still scanned.

## Later changes

- `.env.example` later gained the build base path and the web-push VAPID
  public key (PRD-53); the VAPID private key lives only in Edge Function
  secrets.
