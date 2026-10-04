import { writeLocal } from "~/lib/storage";

// One-time "tap the eye" coachmark in the app bar.
export const PRIVACY_HINT_KEY = "privacy_hint_seen";

export function readPrivacyHintSeen(): boolean {
  try {
    return localStorage.getItem(PRIVACY_HINT_KEY) !== null;
  } catch {
    return true;
  }
}

export function markPrivacyHintSeen(): void {
  writeLocal(PRIVACY_HINT_KEY, "1");
}
