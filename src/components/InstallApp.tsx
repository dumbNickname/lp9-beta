import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { isIos, isStandalone } from "~/lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// "Install the app" row for Settings (PRD-52). Chrome/Edge/Android get a
// real install button; iOS gets Share -> Add to Home Screen instructions.
export default function InstallApp() {
  const [deferred, setDeferred] = createSignal<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = createSignal(false);

  onMount(() => {
    setInstalled(isStandalone());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    onCleanup(() => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    });
  });

  const install = async () => {
    const e = deferred();
    if (!e) return;
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <div class="settings-row">
      <div>
        <p class="settings-label">Home screen app</p>
        <p class="settings-value">
          <Show
            when={!installed()}
            fallback={"Installed — you're using the app version."}
          >
            <Show
              when={isIos()}
              fallback={
                deferred()
                  ? "Open it like an app, full screen, without the browser bar."
                  : "In your browser menu, choose \u201cInstall app\u201d or \u201cAdd to Home screen\u201d."
              }
            >
              Tap Share, then "Add to Home Screen". Needed for
              notifications on iPhone.
            </Show>
          </Show>
        </p>
      </div>
      <Show when={!installed() && deferred()}>
        <button type="button" class="quiet small" onClick={() => void install()}>
          Install
        </button>
      </Show>
    </div>
  );
}
