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
1. Open the app, ⋯ → Settings → **Notifications** card → **Turn on** and
   allow. On iPhone: first Share → **Add to Home Screen** (Safari, or
   Chrome/Edge on iOS 16.4+), open the app from the icon, then turn it
   on there.
2. Quick check on your own device: open the app with `?debug=true`
   (e.g. `…/lp9-beta/app?debug=true#settings`) → **Send test** (see
   "Debug test button" below).
3. From your partner's device, send a heart. You should get "Someone
   appreciated you" (at most once per ~20 h per receiver). Coupon
   events (claim / yes / done) arrive right away.

## How it flows (where things can break)
There is no app server. The chain is:

1. **Browser** subscribes with the VAPID public key and saves the
   subscription via an RPC → row in `public.push_subscriptions`.
2. **Database trigger** (heart, wish, claim event) calls the `notify`
   Edge Function over HTTP via `pg_net`, with the URL + secret from
   Vault. It never blocks or fails the user's action.
3. **Edge Function `notify`** (Deno, runs on Supabase) checks the
   secret, loads the user's devices and sends the push to Google /
   Apple / Mozilla / Microsoft.
4. **Service worker** on the device shows the notification.

Hearts are throttled: one push per receiver per 20 h. The window only
starts when a push can really go out (device saved and Vault secrets
present), so hearts sent before setup do not silence later ones.

## Where the logs are
| Where | What | How to see |
|---|---|---|
| Edge Function `notify` | `push failed <kind> <status> <error>` lines, VAPID config errors | Dashboard → Edge Functions → notify → **Logs** |
| Database (`pg_net`) | The function's answer to every call (kept ~6 h) | SQL below (`net._http_response`) |
| Browser | Nothing stored. With `?debug=true` the Notifications card shows the last test answer | Settings → Notifications |

The function answers each call with
`{"sent": n, "devices": n, "failed": [{"status": ..., "body": ...}]}`.

## Debug test button
Add `?debug=true` to the app URL. Settings → Notifications then shows
**Send test**. It pushes "Notifications are on" to **your own** devices
only (max once per 30 s) and prints the function's answer:

| Shown | Meaning / fix |
|---|---|
| `HTTP 200 … "sent":1` but nothing appears | Push left the server; blocked on the device (OS notification settings, focus mode, battery saver; iPhone: open from Home Screen icon) |
| `HTTP 200 … "sent":0, "failed":[…]` | Push service refused. `403`/`401` in failed = VAPID key pair mismatch (GitHub public key ≠ Supabase keys) or bad `VAPID_SUBJECT`; `404`/`410` = expired device, row deleted, turn off and on again |
| `HTTP 401` | `PUSH_WEBHOOK_SECRET` (function) ≠ Vault `push_webhook_secret` |
| `HTTP 500 … "vapid"` | VAPID secrets missing or malformed in the function |
| `HTTP 404` | Function not deployed or Vault `push_webhook_url` wrong (step 3/4) |
| "Server not set up: Vault secrets …" | Step 4 missing |
| "No device saved on the server" | Turn notifications off and on |
| "No answer … after 10 s" | `pg_net` slow or failed; run the `net._http_response` query |

## SQL checks (SQL editor)
- Vault secrets present: see step 4.
- Registered devices (note your `user_id`):

  ```sql
  select user_id, left(endpoint, 60) as endpoint, created_at, last_used_at
  from public.push_subscriptions order by created_at desc limit 20;
  ```
  `last_used_at` set = a push to that device was accepted by the push
  service.
- What the function answered to recent calls:

  ```sql
  select id, status_code, left(content, 300) as body, error_msg, created
  from net._http_response order by created desc limit 10;
  ```
  No rows after an event = the trigger did not call (no device saved or
  Vault secrets missing).
- Throttle state (reset to test hearts again right away):

  ```sql
  select * from public.push_state;
  delete from public.push_state where user_id = '<user_id>';
  ```
- Send a push without the app (any kind, e.g. `test`, `hearts`):

  ```sql
  select public.push_event('<user_id>', 'test', null);
  ```
  Then check `net._http_response` a few seconds later.

## Troubleshooting
- Settings shows "Notifications aren't set up on this site yet" → step 1
  missing or misnamed (public key not baked into the build), or the
  last deploy ran before the secret was added: re-run it.
- Settings shows "Blocked in your browser" → follow the steps shown in
  the card (pages cannot re-ask once blocked), then **Check again**.
- After changing the VAPID keys: every device must turn notifications
  off and on again (old subscriptions belong to the old key). The card
  shows "off" when the saved subscription has a different key, and
  **Turn on** replaces it.
- Free tier: a paused project (≈1 week idle) drops calls; restore it in
  the dashboard.
