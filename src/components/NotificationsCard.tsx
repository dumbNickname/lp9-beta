import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { sendTestPush, testPushResult } from "~/lib/data/push";
import { errorMessage } from "~/lib/data/errors";
import { isIos, isStandalone, SW_URL } from "~/lib/pwa";
import { currentPushState, disablePush, enablePush, unblockSteps, type PushState } from "~/lib/push";
import { useFocusRefresh } from "~/lib/useFocusRefresh";

export function debugEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("debug") === "true";
  } catch {
    return false;
  }
}

const TEST_COPY: Record<string, string> = {
  no_device: "No device saved on the server. Turn notifications off and on.",
  not_configured: "Server not set up: Vault secrets push_webhook_url / push_webhook_secret missing.",
  too_soon: "Wait 30 seconds between tests.",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Notifications card for Settings (PRD-53). Opt-in, content-free (§8b).
// `?debug=true` adds a test push that reports the server's answer.
export default function NotificationsCard() {
  const [state, setState] = createSignal<PushState | "loading">("loading");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [testing, setTesting] = createSignal(false);
  const [testLog, setTestLog] = createSignal("");
  const [debug, setDebug] = createSignal(false);

  const check = async () => {
    setState(await currentPushState());
  };

  const [swLog, setSwLog] = createSignal("");
  const [info, setInfo] = createSignal("");

  const loadInfo = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      const sw = reg?.active?.state ?? "none";
      const host = sub ? new URL(sub.endpoint).host : "no subscription";
      const held = (await reg?.getNotifications())?.length ?? 0;
      setInfo(`Permission: ${Notification.permission}. Worker: ${sw}. Push service: ${host}. Held: ${held}.`);
    } catch (e) {
      setInfo(`Info failed: ${errorMessage(e)}`);
    }
  };

  // Unique tags: a reused tag silently replaces an old notification still
  // in the OS tray, which looks like "nothing shown".
  const showLocal = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      if (!reg) throw new Error("no service worker");
      const before = (await reg.getNotifications()).length;
      await reg.showNotification("Local test", {
        body: "Shown by the service worker, no server involved.",
        tag: `local-${Date.now()}`,
      });
      const after = (await reg.getNotifications()).length;
      setSwLog(
        `Worker notification requested. Chrome holds ${after} (was ${before}). ` +
          "Held but not visible = macOS hides it (Notifications settings, Focus).",
      );
    } catch (e) {
      setSwLog(`Worker notification failed: ${errorMessage(e)}`);
    }
  };

  const showPage = () => {
    try {
      const n = new Notification("Page test", { body: "Shown by the page itself.", tag: `page-${Date.now()}` });
      setSwLog("Page notification requested...");
      n.onshow = () => setSwLog("Page notification: browser says shown. Not visible = macOS hides it.");
      n.onerror = () => setSwLog("Page notification: browser reported an error showing it.");
    } catch (e) {
      setSwLog(`Page notification failed: ${errorMessage(e)}`);
    }
  };

  // Stays on screen until clicked; on macOS it may use a different
  // Chrome notification entry than normal ones.
  const showSticky = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      if (!reg) throw new Error("no service worker");
      await reg.showNotification("Sticky test", {
        body: "Stays until you click it.",
        tag: `sticky-${Date.now()}`,
        requireInteraction: true,
      });
      setSwLog("Sticky notification requested. Not visible = the OS blocks this browser.");
    } catch (e) {
      setSwLog(`Sticky notification failed: ${errorMessage(e)}`);
    }
  };

  const clearAll = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const list = (await reg?.getNotifications()) ?? [];
      list.forEach((n) => n.close());
      setSwLog(`Cleared ${list.length} notification(s) Chrome was holding for this site.`);
    } catch (e) {
      setSwLog(`Clear failed: ${errorMessage(e)}`);
    }
  };

  onMount(() => {
    setDebug(debugEnabled());
    void check();
    if (!debugEnabled() || !("serviceWorker" in navigator)) return;
    void loadInfo();
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; ok?: boolean; error?: string | null } | null;
      if (d?.type !== "push-received") return;
      setSwLog(d.ok ? "Device received the push and showed it." : `Device received the push, show failed: ${d.error}`);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    onCleanup(() => navigator.serviceWorker.removeEventListener("message", onMsg));
  });
  useFocusRefresh(check);

  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      setState(state() === "on" ? await disablePush() : await enablePush());
    } catch (e) {
      setError("Couldn't change notifications. Please try again.");
      if (debug()) setTestLog(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestLog("Sending...");
    setSwLog("Waiting for the device...");
    try {
      const status = await sendTestPush();
      if (status !== "queued") {
        setTestLog(TEST_COPY[status] ?? status);
        return;
      }
      for (let i = 0; i < 10; i++) {
        await sleep(1000);
        const r = await testPushResult();
        if (r) {
          setTestLog(`HTTP ${r.status_code ?? "-"} ${r.error ?? ""} ${r.body ?? ""}`.trim());
          return;
        }
      }
      setTestLog("Queued, but no answer from the server after 10 s.");
    } catch (e) {
      setTestLog(`Error: ${errorMessage(e)}`);
    } finally {
      setTesting(false);
    }
  };

  const hint = () => {
    switch (state()) {
      case "loading":
        return "Checking...";
      case "unsupported":
        return isIos() && !isStandalone()
          ? "On iPhone, add the app to your Home Screen first, then turn this on there."
          : "This browser can't show notifications.";
      case "unconfigured":
        return "Notifications aren't set up on this site yet.";
      case "denied":
        return "Blocked in your browser. Allow them for this site, then check again.";
      case "on":
        return "On for this device. Hearts and coupon news right away. Never the note itself.";
      case "off":
        return "Get a gentle nudge when your person appreciates you or answers a coupon.";
    }
  };

  return (
    <section class="card settings-panel" aria-labelledby="notify-title">
      <h2 id="notify-title" class="templates-title">Notifications</h2>
      <div class="settings-row">
        <div>
          <p class="settings-label">This device</p>
          <p class="settings-value">{hint()}</p>
          <Show when={error()}>
            <p class="error" role="alert">{error()}</p>
          </Show>
        </div>
        <Show when={state() === "on" || state() === "off"}>
          <button
            type="button"
            class="quiet small"
            aria-pressed={state() === "on"}
            onClick={() => void toggle()}
            disabled={busy()}
          >
            {busy() ? "..." : state() === "on" ? "Turn off" : "Turn on"}
          </button>
        </Show>
      </div>

      <Show when={state() === "denied"}>
        <div class="settings-row notify-unblock">
          <ol class="notify-steps">
            <For each={unblockSteps()}>{(s) => <li>{s}</li>}</For>
          </ol>
          <button type="button" class="quiet small" onClick={() => void check()}>
            Check again
          </button>
        </div>
      </Show>

      <Show when={debug()}>
        <div class="settings-row">
          <div>
            <p class="settings-label">Test (debug)</p>
            <p class="settings-value notify-log" aria-live="polite">
              {testLog() || `State: ${state()}. Sends a test to your own devices.`}
            </p>
          </div>
          <button type="button" class="quiet small" onClick={() => void test()} disabled={testing()}>
            {testing() ? "..." : "Send test"}
          </button>
        </div>
        <div class="settings-row">
          <div>
            <p class="settings-label">This device (debug)</p>
            <p class="settings-value notify-log" aria-live="polite">
              {swLog() || info() || "No push seen yet."}
            </p>
          </div>
          <div class="notify-debug-actions">
            <button type="button" class="quiet small" onClick={() => void showLocal()}>
              Local test
            </button>
            <button type="button" class="quiet small" onClick={showPage}>
              Page test
            </button>
            <button type="button" class="quiet small" onClick={() => void showSticky()}>
              Sticky test
            </button>
            <button type="button" class="quiet small" onClick={() => void clearAll()}>
              Clear held
            </button>
          </div>
        </div>
      </Show>
    </section>
  );
}
