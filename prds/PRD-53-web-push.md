# PRD-53 — Web push notifications (opt-in, content-free, free tier)

Owner 2026-09-29: "approach PWA and notifications now … make it work for
free". Decisions (grilled): DB trigger -> pg_net -> Edge Function;
function deployed by the Supabase GitHub integration (declared in
config.toml); events = hearts (1/day) + coupon flow + new wish.

## Scope
- Migration `0009_push.sql`: `push_subscriptions` (own-row SELECT only;
  writes via `save_push_subscription` / `delete_push_subscription`),
  `push_state` (hearts throttle, no policies), `push_event()` (definer,
  internal: reads URL + secret from Vault, `net.http_post`, never
  raises), triggers on points (hearts, 20 h throttle per receiver),
  coupons (new draft -> giver), coupon_claims (claimed -> deliverer;
  accepted/declined/delivered/auto_refunded -> claimer; cancelled -> the
  other side; nudge -> deliverer).
- Edge Function `supabase/functions/notify` (Deno, `npm:web-push`):
  checks `x-push-secret`, loads the user's subscriptions with the
  service role, sends fixed content-free copy, and prunes 404/410
  endpoints.
- Client `src/lib/push.ts` + `PushToggle.tsx` in Settings (turn on/off,
  states: unsupported / iOS-needs-home-screen / unconfigured / denied /
  on / off). The SW `push` + `notificationclick` handlers are in
  `public/sw.js` (PRD-52).
- `VITE_VAPID_PUBLIC_KEY` baked at build (GH secret); owner setup in
  `docs/push-setup.md`.

## Verification
1. Migration applies; `push_event` no-ops without Vault secrets.
2. After owner setup: turn on in Settings -> a row in
   `push_subscriptions`; the partner sends a heart -> notification;
   second heart within 20 h -> none; a claim -> immediate.
