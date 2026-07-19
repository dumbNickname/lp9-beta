import { createSignal, onCleanup, onMount } from "solid-js";
import { getMyActiveRelationship } from "~/lib/data/relationship";
import type { Relationship } from "~/lib/data/types";

const [relationship, setRelationship] = createSignal<Relationship | null>(null);
const [relationshipLoading, setRelationshipLoading] = createSignal(false);

let lastFetchTime = 0;
const THROTTLE_MS = 2000;

export async function refreshRelationship(): Promise<void> {
  const now = Date.now();
  if (now - lastFetchTime < THROTTLE_MS) return;
  lastFetchTime = now;

  setRelationshipLoading(true);
  try {
    const r = await getMyActiveRelationship();
    setRelationship(r);
  } finally {
    setRelationshipLoading(false);
  }
}

export function useRelationshipFocusRefresh(): void {
  onMount(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshRelationship();
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    onCleanup(() => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    });
  });
}

export { relationship, relationshipLoading };
