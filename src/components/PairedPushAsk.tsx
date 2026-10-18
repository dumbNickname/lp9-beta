import { createSignal, onMount, Show } from "solid-js";
import { currentPushState, enablePush, type PushState } from "~/lib/push";

// One-tap notification ask on the paired moment (owner 2026-10-18). The
// tap triggers the browser's own permission prompt; never asked on load.
export default function PairedPushAsk(props: { partnerName: string }) {
  const [state, setState] = createSignal<PushState | "loading" | "busy">("loading");

  onMount(() => {
    void currentPushState().then(setState, () => setState("unsupported"));
  });

  const turnOn = async () => {
    setState("busy");
    try {
      setState(await enablePush());
    } catch {
      setState("off");
    }
  };

  return (
    <div class="paired-push" aria-live="polite">
      <Show when={state() === "off" || state() === "busy"}>
        <button type="button" class="quiet paired-push-btn" onClick={() => void turnOn()} disabled={state() === "busy"}>
          {state() === "busy" ? "..." : `Tell me when ${props.partnerName} appreciates me`}
        </button>
      </Show>
      <Show when={state() === "on"}>
        <p class="paired-push-note">Notifications on for this device.</p>
      </Show>
      <Show when={state() === "denied"}>
        <p class="paired-push-note">Notifications are blocked in this browser. Settings shows how to allow them.</p>
      </Show>
    </div>
  );
}
