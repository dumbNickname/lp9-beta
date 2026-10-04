import { onCleanup, onMount } from "solid-js";

export function useFocusRefresh(fn: () => void | Promise<void>): void {
  onMount(() => {
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      void Promise.resolve()
        .then(fn)
        .catch((e: unknown) => console.warn("focus refresh failed", e));
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    onCleanup(() => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    });
  });
}
