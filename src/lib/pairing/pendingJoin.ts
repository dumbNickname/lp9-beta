import { createSignal } from "solid-js";
import { parseInviteUrl } from "~/lib/pairing/qr";

// An invite opened via a `#pair=` deep link, held in memory until the user
// joins or cancels. Captured once and the fragment stripped, so it survives
// onboarding and any remount of the pairing UI, but never touches storage
// (the payload carries the AES key).
const [pendingJoin, setPendingJoin] = createSignal<string | null>(null);
// Set when the user already said "Join" on the onboarding screen, so the
// confirm step can redeem without asking twice.
const [joinConfirmed, setJoinConfirmed] = createSignal(false);

export function captureInviteFromUrl(): string | null {
  if (typeof window === "undefined" || !window.location) return pendingJoin();
  const payload = parseInviteUrl(window.location.href);
  if (payload === null) return pendingJoin();
  try {
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}`);
  } catch {
    // History API unavailable; the fragment lingers but pairing still runs.
  }
  setPendingJoin(payload);
  setJoinConfirmed(false);
  return payload;
}

export function clearPendingJoin(): void {
  setPendingJoin(null);
  setJoinConfirmed(false);
}

export { pendingJoin, joinConfirmed, setJoinConfirmed };
