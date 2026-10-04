import { createSignal } from "solid-js";
import { useFocusRefresh } from "~/lib/useFocusRefresh";
import { getMyProfile, updateMyProfile } from "~/lib/data/profile";
import type { Profile, ProfileUpdate } from "~/lib/data/types";

const [profile, setProfile] = createSignal<Profile | null>(null);
const [profileLoading, setProfileLoading] = createSignal(false);

let lastFetchTime = 0;
let loadedOnce = false;
const THROTTLE_MS = 2000;

export async function refreshProfile(): Promise<void> {
  const now = Date.now();
  if (now - lastFetchTime < THROTTLE_MS) return;
  lastFetchTime = now;

  // Only the first load gates the UI; later refreshes update in place so
  // the app shell never unmounts (and loses state) on focus.
  if (!loadedOnce) setProfileLoading(true);
  try {
    const p = await getMyProfile();
    setProfile(p);
    loadedOnce = true;
  } finally {
    setProfileLoading(false);
  }
}

export async function saveProfile(patch: ProfileUpdate): Promise<void> {
  const updated = await updateMyProfile(patch);
  setProfile(updated);
}

export function useProfileFocusRefresh(): void {
  useFocusRefresh(refreshProfile);
}

export { profile, profileLoading };
