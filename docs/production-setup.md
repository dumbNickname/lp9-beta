# Production + beta setup

> **To do after Part H:** shrink this file into a short reference
> (what lives where: secret names, branches, projects, DNS records;
> how to ship; how to rotate keys) and drop the click-by-click steps.

One-time manual steps for PRD-57. Do them in order; each part says what
to copy where. Keep every key in a password manager outside the repo.

**Result:**
- **Beta:** `https://endeary-beta.<your-account>.workers.dev`, deployed
  on every push to `master` (or by hand with `pnpm deploy:beta`), using
  the beta Supabase project.
- **Production:** `https://endeary.com`, deployed on every push to
  `release`, using a separate prod Supabase project.

All values below are **public** (they ship in the browser) except the
Cloudflare API token, the VAPID private key, the webhook secret and the
database password.

**Two kinds of Supabase wiring.** The Supabase GitHub integration
(set up in the Supabase dashboard) applies migrations and deploys Edge
Functions; it needs no keys in GitHub. The *web build* separately bakes
the project URL and publishable key into the site, so those go into
GitHub secrets.

**GitHub secrets, in general:** repo → Settings → Secrets and variables
→ **Actions** → tab **Secrets** (not Variables, not Dependabot).
"Repository secrets" are seen by every job; "Environment secrets" only
by jobs running in that environment. Changing a secret does not re-run
anything: open the failed run → **Re-run failed jobs**. Job logs are
visible only when signed in to GitHub.

## Part A — Cloudflare (beta host)

1. Log in to the Cloudflare dashboard.
2. **Account ID:** Workers & Pages → Overview, right column "Account
   ID" (also the part of the dashboard URL after
   `dash.cloudflare.com/`, or run `pnpm exec wrangler whoami`). It is
   32 hex characters, not your email and not the workers.dev
   subdomain. A wrong value makes the CI deploy fail.
3. **API token:** profile icon → My Profile → API Tokens → Create
   Token → template **Edit Cloudflare Workers** → Account Resources:
   your account; Zone Resources: All zones → Continue → Create. Copy
   the token (shown once). A narrower token fails with an
   authentication error.
4. **workers.dev subdomain:** Workers & Pages → Overview shows
   `<your-account>.workers.dev`. The beta URL will be
   `https://endeary-beta.<your-account>.workers.dev`.

## Part B — First beta deploy by hand

The Worker does not exist until the first deploy. From the repo, in a
shell with nvm loaded (`source ~/.nvm/nvm.sh`):

1. Create `.env.beta` in the repo root (gitignored), one `NAME=value`
   per line, then `chmod 600 .env.beta`:

```
CLOUDFLARE_API_TOKEN=<token from A3>
CLOUDFLARE_ACCOUNT_ID=<id from A2>
```

2. Run `pnpm deploy:beta`. It reads exported vars, then `.env.beta`,
   then `.env` (beta Supabase URL and key are already there), builds
   with the name "Endeary beta", deploys, and never prints the values.
   An agent on the same machine can run it without seeing them.
3. Open the beta URL: title "Endeary beta".

Testers start fresh on the new address: device keys belong to a site
address, so everyone onboards and pairs again.

## Part C — GitHub (beta deploy on push)

Repository secrets (see "GitHub secrets" above):

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | token from A3 |
| `CLOUDFLARE_ACCOUNT_ID` | id from A2 |

The beta Supabase secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VAPID_PUBLIC_KEY`) already exist; leave them.

Then push any commit to `master` (or re-run the last Deploy run) and
check Actions → Deploy → job **beta** is green. Without the token the
job only builds and warns.

**Keep-alive check:** Cloudflare → Workers & Pages → `endeary-beta` →
Settings → Triggers shows one daily cron. Trigger it once; Logs show
`keepalive beta: ok` (and `prod: not configured` until Part G3).

## Part D — Supabase (new production project)

1. Dashboard → **New project**. Organization: same as beta. Name:
   `endeary-prod`. Region: **Central EU (Frankfurt)**. Plan: Free.
   Save the database password in a password manager.
2. Make sure the project picker at the top shows `endeary-prod`, then
   Authentication → Sign In / Providers → **Allow anonymous sign-ins**:
   on (keep "Allow new users to sign up" on) → Save. Required: the app
   signs every user in anonymously; with it off nobody gets past
   onboarding.
3. Authentication → URL Configuration → Site URL:
   `https://endeary.com` → Save. Redirect URLs stay empty.
4. The branch `release` must exist on GitHub first, or Supabase reports
   "Branch not found". Create it once: `git push beta master:release`
   (this also starts a production build that fails at "Check prod
   values" until Part G; harmless, nothing deploys).
5. Project Settings (gear, bottom of sidebar) → Integrations →
   **GitHub Integration** → Authorize GitHub → Choose repository
   `dumbNickname/lp9-beta`:
   - **Working directory:** `.`
   - **Production branch:** `release`
   - **Deploy to production:** on
   - **Automatic branching:** off (previews stay on the beta project)
   - Enable integration.
   The same repo can be connected to both projects.
6. Once connected, the integration applies all migrations and deploys
   the `notify` function from `release` (Integrations / Branches shows
   the deployment).
7. Check the **beta** project's integration: production branch still
   `master`, no preview branch for `release`.
8. Project Settings → API Keys: copy the **Project URL** and the
   **publishable key** (`sb_publishable_...`) to the password manager.

## Part E — DNS for endeary.com (OVH)

Do this early: it takes minutes to hours and can run in parallel with
F and G.

OVH Manager → Web Cloud → Domain names → `endeary.com` → **DNS zone**.

1. Delete the existing **A**, **AAAA** and **CNAME** records for
   `endeary.com` and `www.endeary.com` (OVH parking defaults, often
   `213.186.33.x`). Keep MX, TXT/SPF and NS records. If the domain has
   a **Redirection** entry, delete it too (it is built from A records).
2. Add four **A** records, subdomain empty, TTL default:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
   `185.199.111.153`.
3. Add four **AAAA** records, subdomain empty:
   `2606:50c0:8000::153`, `2606:50c0:8001::153`,
   `2606:50c0:8002::153`, `2606:50c0:8003::153`.
4. Add one **CNAME** record: subdomain `www`, target
   `dumbnickname.github.io.` (with the trailing dot).
5. Until the first prod deploy the domain shows a GitHub 404; harmless.
   Ask the agent to check the records once saved.
6. **Verify the domain on GitHub** (stops anyone else claiming it on
   Pages): your GitHub **profile** settings (not the repo) → Pages →
   Add a domain → `endeary.com`. Add the shown TXT record
   (`_github-pages-challenge-<user>`) in OVH, wait, click Verify.
7. Repo → Settings → **Pages** → Source must be **GitHub Actions**. Do
   not set the custom domain yet (Part H).

## Part F — Push keys for production

Production gets its own keys; never reuse the beta ones.

1. On your machine: `npx web-push generate-vapid-keys` (public +
   private key) and `openssl rand -base64 24` (webhook secret). Save
   all three in a password manager, labelled "prod".
2. Prod project → Edge Functions → Secrets, add:
   - `VAPID_PUBLIC_KEY` = prod public key
   - `VAPID_PRIVATE_KEY` = prod private key
   - `VAPID_SUBJECT` = `mailto:<your email>`
   - `PUSH_WEBHOOK_SECRET` = prod webhook secret
3. Once `notify` is deployed (D6), prod project → SQL Editor, run once
   with your values:

```sql
select vault.create_secret('<prod webhook secret>', 'push_webhook_secret');
select vault.create_secret('https://<prod-ref>.supabase.co/functions/v1/notify', 'push_webhook_url');
```

`<prod-ref>` is the part of the prod Project URL before `.supabase.co`.

## Part G — GitHub (production)

1. Settings → Environments → **New environment** `production`.
   - Deployment branches and tags → **Selected branches** → add
     `release`.
   - Environment secrets (the production build reads only these):

| Name | Value |
|---|---|
| `PROD_SUPABASE_URL` | prod Project URL (D8) |
| `PROD_SUPABASE_KEY` | prod publishable key (D8) |
| `PROD_VAPID_PUBLIC_KEY` | prod VAPID public key (F1) |

2. Settings → Environments → `github-pages` → Deployment branches →
   add `release` (`master` can go; Pages is prod-only now).
3. Repository secrets, again, for the keep-alive cron (the beta job
   runs outside the `production` environment, so it cannot see the
   copies above):

| Name | Value |
|---|---|
| `PROD_SUPABASE_URL` | same as above |
| `PROD_SUPABASE_KEY` | same as above |

## Part H — First production release

1. Re-run the failed production build from D4 (or, if `master` has
   moved, ask the agent to `git push beta master:release`).
2. GitHub Actions → Deploy → jobs **production-build** and
   **production-deploy** green. The build fails on purpose if the prod
   values are missing or equal the beta ones.
3. Repo → Settings → **Pages** → Custom domain: `endeary.com` → Save.
   Wait for the DNS check to pass, then tick **Enforce HTTPS** (the
   certificate can take up to an hour). From then on the old
   `dumbnickname.github.io/lp9-beta/` address redirects to production,
   not to the new beta.
4. Open `https://endeary.com`: title "Endeary", app at `/app`.
   `https://www.endeary.com` redirects to it.
5. Push the next beta commit (or re-run the beta job) so the keep-alive
   cron learns the prod project; Logs then show `keepalive prod: ok`.
6. Tell the agent: it runs a two-user check on the live site and marks
   PRD-57 done.

## Shipping later

Every release: `git push beta master:release` (fast-forward). Code and
migrations go to production together. Beta keeps following `master`.

## Check the keep-alive

Cloudflare → Workers & Pages → `endeary-beta` → Logs (or Settings →
Triggers → cron, "Trigger"). Daily lines `keepalive beta: ok` and
`keepalive prod: ok` mean neither project will pause.
