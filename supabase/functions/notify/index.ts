// Edge Function `notify` (PRD-53). Called by DB triggers via pg_net with
// a shared secret; sends content-free web push to the user's devices.
// Secrets (Dashboard -> Edge Functions -> Secrets):
//   PUSH_WEBHOOK_SECRET  same value as vault secret push_webhook_secret
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@...)
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.108.2";

const COPY: Record<string, { title: string; body: string; path: string; tag: string }> = {
  hearts: { title: "Someone appreciated you", body: "Open the app to read it.", path: "app", tag: "hearts" },
  wish: { title: "A new wish for you to look at", body: "Say yes, or gently pass.", path: "app#theirs", tag: "wish" },
  claimed: { title: "A coupon was claimed", body: "Time to plan something nice.", path: "app#theirs", tag: "claim" },
  accepted: { title: "Good news", body: "Your coupon got a yes.", path: "app#mine", tag: "claim" },
  declined: { title: "Not right now", body: "Your hearts were returned.", path: "app#mine", tag: "claim" },
  delivered: { title: "Done together", body: "A wish was marked done. Hope it was lovely.", path: "app", tag: "claim" },
  cancelled: { title: "A plan was cancelled", body: "Hearts were returned.", path: "app", tag: "claim" },
  auto_refunded: { title: "Hearts returned", body: "A claim waited 14 days with no answer.", path: "app#mine", tag: "claim" },
  nudge: { title: "A gentle reminder", body: "A coupon is waiting for your answer.", path: "app#theirs", tag: "claim" },
  test: { title: "Notifications are on", body: "You'll hear from us gently.", path: "app#settings", tag: "test" },
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method" });
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-push-secret") !== secret) return json(401, { error: "unauthorized" });

  let payload: { user_id?: string; kind?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "bad json" });
  }
  const copy = payload.kind ? COPY[payload.kind] : undefined;
  if (!payload.user_id || !copy) return json(400, { error: "bad payload" });

  try {
    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );
  } catch (e) {
    console.error("vapid config", e);
    return json(500, { error: "vapid", detail: String((e as Error).message ?? e).slice(0, 200) });
  }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", payload.user_id);
  if (error) return json(500, { error: "db" });

  let sent = 0;
  const failed: { status: number | null; body: string }[] = [];
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(copy),
        { TTL: 60 * 60 * 24 },
      );
      sent++;
      await db.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string };
      const code = err.statusCode;
      const body = String(err.body || err.message || e).slice(0, 300);
      failed.push({ status: code ?? null, body });
      console.error("push failed", payload.kind, code ?? "-", body);
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return json(200, { sent, devices: subs?.length ?? 0, failed });
});
