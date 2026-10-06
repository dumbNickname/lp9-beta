import { createSignal, For, onMount, Show } from "solid-js";
import { sendTestPush, testPushResult } from "~/lib/data/push";
import { errorMessage } from "~/lib/data/errors";
import { isIos, isStandalone } from "~/lib/pwa";
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

  onMount(() => {
    setDebug(debugEnabled());
    void check();
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
        return "On for this device. At most one a day for hearts; coupon news right away. Never the note itself.";
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
      </Show>
    </section>
  );
}
