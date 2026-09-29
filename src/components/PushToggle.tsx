import { createSignal, onMount, Show } from "solid-js";
import { isIos, isStandalone } from "~/lib/pwa";
import { currentPushState, disablePush, enablePush, type PushState } from "~/lib/push";

// Notifications row for Settings (PRD-53). Opt-in, content-free (§8b).
export default function PushToggle() {
  const [state, setState] = createSignal<PushState | "loading">("loading");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  onMount(() => {
    void currentPushState().then(setState);
  });

  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      setState(state() === "on" ? await disablePush() : await enablePush());
    } catch {
      setError("Couldn't change notifications. Please try again.");
    } finally {
      setBusy(false);
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
        return "Blocked in your browser settings. Allow notifications for this site to turn them on.";
      case "on":
        return "On for this device. At most one a day for hearts; coupon news right away. Never the note itself.";
      case "off":
        return "Get a gentle nudge when your person appreciates you or answers a coupon.";
    }
  };

  return (
    <div class="settings-row">
      <div>
        <p class="settings-label">Notifications</p>
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
  );
}
