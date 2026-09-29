import { supabase } from "~/lib/supabase";
import { SW_URL } from "~/lib/pwa";

// Web push client (PRD-53). The VAPID *public* key is public-safe and baked
// at build time; the private key lives only in the Edge Function secrets.
export function vapidPublicKey(): string {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";
}

export type PushState = "unsupported" | "unconfigured" | "denied" | "off" | "on";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  return existing ?? (await navigator.serviceWorker.register(SW_URL));
}

export async function currentPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (!vapidPublicKey()) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

function keyToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (!vapidPublicKey()) return "unconfigured";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey()) as BufferSource,
    }));
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: keyToBase64(sub.getKey("p256dh")),
    p_auth: keyToBase64(sub.getKey("auth")),
    p_user_agent: navigator.userAgent,
  });
  if (error) {
    await sub.unsubscribe().catch(() => undefined);
    throw error;
  }
  return "on";
}

export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await supabase.rpc("delete_push_subscription", { p_endpoint: sub.endpoint });
    await sub.unsubscribe().catch(() => undefined);
  }
  return "off";
}
