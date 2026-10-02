# PRD-53 — Web push notifications (opt-in, content-free, free tier)

> Status: see `PROGRESS.md` (owner setup pending).

## Goal
Owner 2026-09-29: "approach PWA and notifications now … make it work
for free". Opt-in web push replaces the parked email channel, following
DESIGN §8 (amended 2026-09-29).

## What shipped
- **Tables:** `push_subscriptions` (own-row SELECT only; writes only
  via definer RPCs `save_push_subscription` /
  `delete_push_subscription`); `push_state` (hearts throttle, no
  policies).
- **`push_event()`** (definer, internal, not callable by clients):
  reads the function URL + shared secret from Vault, posts via pg_net,
  never raises (a push failure never breaks the write that caused it).
- **Triggers / who is notified:**
  - points (hearts) -> receiver, at most one per 20 h per receiver;
  - new coupon draft -> giver;
  - claim claimed -> deliverer; accepted / declined / delivered /
    auto_refunded -> claimer; cancelled -> the other side; nudge ->
    deliverer. Coupon-flow events are immediate.
- **Edge Function `notify`:** checks the `x-push-secret` header, loads
  the user's subscriptions with the service role, sends fixed
  content-free copy, prunes 404/410 endpoints.
- **Client:** Notifications row in Settings to turn on/off; states:
  unsupported / iOS needs home screen / unconfigured / denied / on /
  off. Service worker (PRD-52) handles `push` and notification clicks.
- VAPID public key baked at build as a public `VITE_` value (GitHub
  secret); private key and push secret live only in Supabase.

## Decisions (grilled)
- Pipeline: DB trigger -> pg_net -> Edge Function; free tier only.
- The function is deployed by the Supabase GitHub integration, so it
  must be declared in the Supabase config.
- Events: hearts (max 1/day) + coupon flow + new wish.
- **Content-free:** fixed copy, no note text, counts or previews
  (§8b); user-toggleable and opt-in.

## Verification
1. Migration applies; `push_event` no-ops without Vault secrets.
2. Owner-pending (after setup in `docs/push-setup.md`): turn on in
   Settings -> a row in `push_subscriptions`; partner sends a heart ->
   notification; second heart within 20 h -> none; a claim ->
   immediate.
