# Push notifications — one-time setup (owner)

Everything here is **free**: browser push services (Google FCM, Mozilla,
Apple) cost nothing, and Supabase free tier includes Edge Functions,
`pg_net` and Vault. Keep the generated keys in a private file outside
the repo. If you lose them,
generate new ones: `npx web-push generate-vapid-keys` and a random
secret (`openssl rand -base64 24`).

Never commit the private key or the webhook secret.

## 1. GitHub — public key for the web build
Repo → Settings → Secrets and variables → Actions → **New repository
secret**
- `VAPID_PUBLIC_KEY` = the public key (the workflow also accepts the
  name `VITE_VAPID_PUBLIC_KEY`). Must be a **Repository secret**, not a
  Variable or an environment secret.
Then re-run the latest "Deploy to GitHub Pages" workflow (or push any
commit).

## 2. Supabase — Edge Function secrets
Dashboard → **Edge Functions → Secrets** (or Project Settings → Edge
Functions) → add:
- `VAPID_PUBLIC_KEY` = public key
- `VAPID_PRIVATE_KEY` = private key
- `VAPID_SUBJECT` = `mailto:<your email>`
- `PUSH_WEBHOOK_SECRET` = the random secret

## 3. Supabase — the function itself
`supabase/functions/notify` is declared in `supabase/config.toml`, so
the GitHub integration deploys it on merge to `master` **if "Deploy to
production" is enabled** in Project Settings → Integrations → GitHub.
Check Dashboard → Edge Functions: `notify` should be listed. If not,
deploy once from a machine with the CLI:
`supabase functions deploy notify --no-verify-jwt --project-ref <ref>`.

## 4. Supabase — tell the database where to call (SQL editor)
Dashboard → **SQL Editor**, run once (replace the placeholders):

```sql
select vault.create_secret('<PUSH_WEBHOOK_SECRET>', 'push_webhook_secret');
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/notify', 'push_webhook_url');
```

Until both exist, the database triggers do nothing (no errors).

Check they exist:

```sql
select name, created_at from vault.secrets
where name in ('push_webhook_secret', 'push_webhook_url');
```

Rotate later:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'push_webhook_secret'),
  '<new secret>');
```

## 5. Try it
1. Open the app, ⋯ → Settings → Notifications → **Turn on** and allow.
   On iPhone: first Safari → Share → **Add to Home Screen**, open the
   app from the icon, then turn it on there (iOS 16.4+).
2. From your partner's device, send a heart. You should get "Someone
   appreciated you" (at most once per ~20 h per receiver). Coupon
   events (claim / yes / delivered) arrive right away.

## Troubleshooting
- Dashboard → Edge Functions → notify → **Logs**: 401 = secret
  mismatch between Vault and function secret; 500 = missing VAPID keys.
- Calls the database made to the function:

  ```sql
  select id, status_code, left(content, 120) as body, created
  from net._http_response order by created desc limit 10;
  ```
- Registered devices:

  ```sql
  select user_id, left(endpoint, 60) as endpoint, created_at, last_used_at
  from public.push_subscriptions order by created_at desc limit 20;
  ```
- Settings shows "Notifications aren't set up on this site yet" → step 1
  missing or misnamed (public key not baked into the build), or the
  last deploy ran before the secret was added: re-run it.
