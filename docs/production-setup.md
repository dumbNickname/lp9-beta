# Production + beta setup — owner steps

One-time manual steps for PRD-57. Do them in order; each part says what
to copy where. Keep every key in your private file outside the repo.

**Result:**
- **Beta:** `https://endeary-beta.<your-account>.workers.dev`, deployed
  on every push to `master` (or by hand with `pnpm deploy:beta`), using
  the current Supabase project.
- **Production:** `https://endeary.com`, deployed on every push to
  `release`, using a new Supabase project.

All values below are **public** (they ship in the browser) except the
Cloudflare API token, the VAPID private key and the webhook secret.

## Part A — Cloudflare (beta host)

1. Log in to the Cloudflare dashboard (the account you use for your
   other Workers).
2. **Account ID:** Workers & Pages → Overview, right column "Account
   ID". Copy it.
3. **API token:** profile icon → My Profile → API Tokens → Create
   Token → template **Edit Cloudflare Workers** → Account Resources:
   your account; Zone Resources: All zones → Continue → Create. Copy
   the token (shown once).
4. **workers.dev subdomain:** Workers & Pages → Overview shows
   `<your-account>.workers.dev`. The beta URL will be
   `https://endeary-beta.<your-account>.workers.dev`.

## Part B — GitHub (beta)

Repo `dumbNickname/lp9-beta` → Settings → Secrets and variables →
Actions → **New repository secret**:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | token from A3 |
| `CLOUDFLARE_ACCOUNT_ID` | id from A2 |

The beta Supabase secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VAPID_PUBLIC_KEY`) already exist; leave them.

Then push any commit to `master` (or ask the agent) and check Actions →
Deploy → job **beta** is green. Open the beta URL; the title says
"Endeary beta".

## Part C — Deploy beta by hand (optional)

From the repo, in a shell with nvm loaded:

```bash
export CLOUDFLARE_API_TOKEN=...      # from A3
export CLOUDFLARE_ACCOUNT_ID=...     # from A2
pnpm deploy:beta
```

The Supabase values are read from `.env` (already there). To keep the
Cloudflare values too, put them in a `.env.beta` file in the repo root
(gitignored), one `NAME=value` per line; then `pnpm deploy:beta` alone
works, and the agent can run it without seeing the values.

## Part D — Supabase (new production project)

1. Dashboard → **New project**. Organization: same as beta. Name:
   `endeary-prod`. Region: **Central EU (Frankfurt)**. Plan: Free.
   Save the database password in your private file.
2. Authentication → Sign In / Providers → **Allow anonymous sign-ins**:
   on. Save.
3. Authentication → URL Configuration → Site URL:
   `https://endeary.com`. Save.
4. Project Settings → Integrations → **GitHub** → Authorize → repo
   `dumbNickname/lp9-beta`, working directory `.`.
   - **Production branch:** `release`.
   - **Deploy to production:** on.
   - **Automatic branching:** off (previews stay on the beta project).
   - Enable integration.
5. Project Settings → API Keys (or Data API): copy the **Project URL**
   and the **publishable key** (`sb_publishable_...`).
6. The database is still empty: migrations arrive with the first push
   to `release` (Part H).
7. If Supabase refuses to connect the repo to a second project, stop
   and tell the agent. Also check the **beta** project's integration:
   if it starts a preview branch for `release`, turn on "Supabase
   changes only" there or tell the agent.

## Part E — Push keys for production

Production gets its own keys; never reuse the beta ones.

1. On your machine: `npx web-push generate-vapid-keys` (public +
   private key) and `openssl rand -base64 24` (webhook secret). Save
   all three in your private file, labelled "prod".
2. Prod project → Edge Functions → Secrets, add:
   - `VAPID_PUBLIC_KEY` = prod public key
   - `VAPID_PRIVATE_KEY` = prod private key
   - `VAPID_SUBJECT` = `mailto:<your email>`
   - `PUSH_WEBHOOK_SECRET` = prod webhook secret
3. After Part H (function deployed), prod project → SQL Editor, run
   once with your values:

```sql
select vault.create_secret('<prod webhook secret>', 'push_webhook_secret');
select vault.create_secret('https://<prod-ref>.supabase.co/functions/v1/notify', 'push_webhook_url');
```

`<prod-ref>` is the part of the prod Project URL before `.supabase.co`.

## Part F — GitHub (production)

1. Settings → Environments → **New environment** `production`.
   - Deployment branches and tags → **Selected branches** → add
     `release`.
   - Environment secrets:

| Name | Value |
|---|---|
| `PROD_SUPABASE_URL` | prod Project URL (D5) |
| `PROD_SUPABASE_KEY` | prod publishable key (D5) |
| `PROD_VAPID_PUBLIC_KEY` | prod VAPID public key (E1) |

2. Settings → Environments → `github-pages` → Deployment branches →
   add `release` (keep or remove `master`; Pages is prod-only now).
3. Repository secrets (Actions → New repository secret), for the
   keep-alive cron on the beta Worker:

| Name | Value |
|---|---|
| `PROD_SUPABASE_URL` | same as above |
| `PROD_SUPABASE_KEY` | same as above |

## Part G — OVH DNS for endeary.com

OVH Manager → Web Cloud → Domain names → `endeary.com` → **DNS zone**.

1. Delete the existing **A**, **AAAA** and **CNAME** records for
   `endeary.com` and `www.endeary.com` (OVH parking defaults). Keep MX,
   TXT/SPF and NS records.
2. Add four **A** records, subdomain empty, TTL default:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
   `185.199.111.153`.
3. Add four **AAAA** records, subdomain empty:
   `2606:50c0:8000::153`, `2606:50c0:8001::153`,
   `2606:50c0:8002::153`, `2606:50c0:8003::153`.
4. Add one **CNAME** record: subdomain `www`, target
   `dumbnickname.github.io.` (with the trailing dot).
5. Changes take minutes to a few hours.

## Part H — First production release

1. Ask the agent (or run): `git push beta master:release`.
2. Supabase prod project → Integrations / Branches shows the
   deployment: all migrations applied, `notify` function deployed.
   Then finish Part E3.
3. GitHub Actions → Deploy → jobs **production-build** and
   **production-deploy** green.
4. Repo → Settings → **Pages** → Custom domain: `endeary.com` → Save.
   Wait for the DNS check to pass, then tick **Enforce HTTPS** (the
   certificate can take up to an hour).
5. Open `https://endeary.com`: title "Endeary", app at `/app`.
   `https://www.endeary.com` redirects to it.
6. Push the next beta commit (or `pnpm deploy:beta` with the prod
   values set) so the keep-alive cron knows the prod project.

## Shipping later

Every release: `git push beta master:release` (fast-forward). Code and
migrations go to production together. Beta keeps following `master`.

## Check the keep-alive

Cloudflare → Workers & Pages → `endeary-beta` → Logs (or Settings →
Triggers → cron, "Trigger"). Daily lines `keepalive beta: ok` and
`keepalive prod: ok` mean neither project will pause.
