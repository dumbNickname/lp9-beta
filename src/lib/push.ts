import { deletePushSubscription, savePushSubscription } from "~/lib/data/push";
import { SW_URL } from "~/lib/pwa";

// Web push client (PRD-53). The VAPID *public* key is public-safe and baked
// at build time; the private key lives only in the Edge Function secrets.
export function vapidPublicKey(): string {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";
}

export type PushState = "unsupported" | "unconfigured" | "denied" | "off" | "on";

export type BrowserKind = "ios" | "android" | "safari" | "firefox" | "chromium";

export function browserKind(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): BrowserKind {
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/firefox/i.test(ua)) return "firefox";
  if (/safari/i.test(ua) && !/chrome|chromium|edg/i.test(ua)) return "safari";
  return "chromium";
}

// Pages cannot reopen a blocked permission prompt; the user has to flip
// it in the browser. Short steps per browser family.
export function unblockSteps(kind: BrowserKind = browserKind()): string[] {
  switch (kind) {
    case "ios":
      return ["Open the iPhone Settings app", "Notifications, then this app", "Turn on Allow Notifications"];
    case "android":
      return [
        "Tap the icon left of the address bar (or long-press the app icon, then App info)",
        "Permissions, then Notifications",
        "Allow, then come back here",
      ];
    case "safari":
      return ["Safari menu, then Settings", "Websites, then Notifications", "Set this site to Allow"];
    case "firefox":
      return ["Click the icon left of the address bar", "Clear the blocked Notifications permission", "Reload and turn on again"];
    case "chromium":
      return ["Click the icon left of the address bar", "Site settings, then Notifications", "Set to Allow and come back"];
  }
}

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
    if (!sub) return "off";
    if (Notification.permission !== "granted") return "off";
    if (!sameKey(sub.options.applicationServerKey, urlBase64ToUint8Array(vapidPublicKey()))) return "off";
    // Re-save quietly: the server row may be gone (expired, reset) while
    // the browser still holds the subscription.
    await saveSub(sub).catch(() => undefined);
    return "on";
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

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return true;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

function saveSub(sub: PushSubscription): Promise<void> {
  return savePushSubscription(
    { endpoint: sub.endpoint, p256dh: keyToBase64(sub.getKey("p256dh")), auth: keyToBase64(sub.getKey("auth")) },
    navigator.userAgent,
  );
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (!vapidPublicKey()) return "unconfigured";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const key = urlBase64ToUint8Array(vapidPublicKey());
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options.applicationServerKey, key)) {
    await sub.unsubscribe().catch(() => undefined);
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key as BufferSource,
  });
  try {
    await saveSub(sub);
  } catch (e) {
    await sub.unsubscribe().catch(() => undefined);
    throw e;
  }
  return "on";
}

export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await deletePushSubscription(sub.endpoint).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
  return "off";
}
