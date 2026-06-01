# PRD-06 — `.gitignore` + `.env.example` + gitleaks pre-commit

## Goal

Make it impossible (in normal flow) to commit secrets: gitignore real
secret files, ship a documented `.env.example`, and wire `gitleaks`
as a pre-commit hook that fails the commit on a hit.

## Scope

**In:**
- `.gitignore` covering at least: `node_modules/`, `.output/`, `.vinxi/`,
  `dist/`, `.env`, `.env.local`, `.env.*.local`, IDE dirs (`.vscode/`,
  `.idea/`), OS dirs (`.DS_Store`, `Thumbs.db`), Jupyter
  `.ipynb_checkpoints/`, `.aider*`.
- `.env.example` documenting every variable the project will use,
  with placeholders. Initial set (see `DESIGN.md` §16e for why no
  Supabase access token / DB password is needed):
  - `VITE_SUPABASE_URL=`         (project URL; ships in browser bundle)
  - `VITE_SUPABASE_ANON_KEY=`    (RLS-protected; ships in browser bundle)
- `.gitleaks.toml` config tuned for this project:
  - Default ruleset enabled.
  - Allowlist for `LICENSE` (AGPL text contains base64-ish patterns
    that can false-positive).
  - Allowlist for `.env.example` (placeholder values only — but verify
    placeholders never look like real secrets).
- Pre-commit hook installed via a tiny `scripts/install-git-hooks.sh`
  that copies a hook script into `.git/hooks/pre-commit`. Hook calls
  `gitleaks protect --staged --redact`.
- `scripts/install-toolchain.sh` updated to invoke
  `scripts/install-git-hooks.sh` after binaries are in place.

**Out:**
- CI-side gitleaks scan (deferred to PRD-09 deploy workflow).
- Secret rotation runbook (just live in `DESIGN.md` §16g; no separate
  doc).

## Touched files / new files

- `.gitignore` — new.
- `.env.example` — new.
- `.gitleaks.toml` — new.
- `scripts/install-git-hooks.sh` — new.
- `scripts/git-hooks/pre-commit` — new (the hook source).
- `scripts/install-toolchain.sh` — modified to call the new script.

## Data model impact

None.

## UI behavior

None.

## Verification

1. `git status` on a fresh clone after `pnpm install` shows
   `node_modules/` not tracked.
2. Creating `.env` with garbage content does NOT show in `git status`.
3. After `bash scripts/install-toolchain.sh`, `.git/hooks/pre-commit`
   exists, is executable, and runs gitleaks.
4. `git commit` of a file containing a fake secret pattern (e.g.
   `SUPABASE_SERVICE_ROLE=eyJabc...` placeholder JWT) is **rejected**
   by the hook; commit of normal content passes.
5. `.env.example` placeholders themselves do NOT trigger gitleaks
   (allowlist works).

**Unit tests:** N/A (config + hooks).

**QA suite:**
- Adversarial: paste a real-looking JWT into a markdown file and try
  to commit. Hook must reject.
- Adversarial: paste a real-looking JWT into `.env` and try to commit
  `.env`. Should fail at gitignore (never tracked) AND at gitleaks
  if explicitly `git add -f`'d.
- Verify `LICENSE` allowlist works (AGPL text commits fine).
- Verify hook is bypassable with `--no-verify` (intentional escape
  hatch) but documented.

## Open questions

- Should the hook block on `--no-verify` bypass? No — too hostile;
  document the escape hatch instead.
