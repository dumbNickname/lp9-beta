# PRD-53 — Web push notifications (opt-in, content-free, free tier)

> Status: see `PROGRESS.md` (owner setup pending).

## Goal
Owner 2026-09-29: "approach PWA and notifications now … make it work
for free". Opt-in web push replaces the parked email channel, following
DESIGN §8 (amended 2026-09-29).

## What shipped
- **Tables:** `push_subscriptions` (own-row SELECT only; writes only
  via definer RPCs `save_push_subscription` /
  `delete_push_subscription`); `push_state` (test throttle, no
  policies).
- **`push_event()`** (definer, internal, not callable by clients):
  reads the function URL + shared secret from Vault, posts via pg_net,
  never raises (a push failure never breaks the write that caused it).
- **Triggers / who is notified:**
  - points (hearts) -> receiver, on every heart (see Later changes);
  - new coupon draft -> giver;
  - claim claimed -> deliverer; accepted / declined / delivered /
    auto_refunded -> claimer; cancelled -> the other side; nudge ->
    deliverer. Coupon-flow events are immediate.
- **Edge Function `notify`:** checks the `x-push-secret` header, loads
  the user's subscriptions with the service role, sends fixed
  content-free copy, prunes 404/410 endpoints, logs failures and
  answers `{sent, devices, failed}`.
- **Client:** own Notifications card in Settings: on/off; states
  unsupported / iOS needs home screen / unconfigured / denied / on /
  off; denied shows per-browser unblock steps + Check again; re-checks
  on focus; re-saves the device to the server; re-subscribes when the
  VAPID key changed. Service worker (PRD-52) handles `push` and
  notification clicks.
- **Debug (`?debug=true`):** Send test (definer RPC `send_test_push`,
  caller's own devices, max 1 per 30 s) shows the function's answer
  via `test_push_result`; the service worker reports to the page when
  a push arrived and was shown; Local test shows a notification with no
  server; status line (permission, worker, push service).
- VAPID public key baked at build as a public `VITE_` value (GitHub
  secret); private key and push secret live only in Supabase.

## Decisions (grilled)
- Pipeline: DB trigger -> pg_net -> Edge Function; free tier only.
- The function is deployed by the Supabase GitHub integration, so it
  must be declared in the Supabase config.
- Events: hearts + coupon flow + new wish.
- **Content-free:** fixed copy, no note text, counts or previews
  (§8b); user-toggleable and opt-in.

## Verification
1. Migration applies; `push_event` no-ops without Vault secrets.
   Owner device check (Chrome, FCM): debug Send test -> `sent:1` and
   "Device received the push and showed it"; not seen on screen with
   Do Not Disturb on (to re-check with DND off).
2. Owner-pending (after setup in `docs/push-setup.md`): turn on in
   Settings -> a row in `push_subscriptions`; partner sends a heart ->
   notification; second heart -> another one; a claim -> immediate.

## Later changes
- 2026-10-16 (owner, DESIGN §8a): hearts 20 h throttle removed;
  every heart pushes. `push_state.last_hearts_push_at` is unused.
- 2026-10-18: pushes re-alert when replacing a same-tag notification
  (`renotify`); debug adds Page test, Clear held, held count; Local
  test uses unique tags; Sticky test.
