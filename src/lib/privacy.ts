import { createSignal } from "solid-js";

// Shoulder-surf veil (DESIGN.md §15, amended): OFF by default, remembered
// on this device once turned on. While on, comments and private wishes are
// veiled; tapping one asks to reveal just that item (for this session) or
// to turn the mode off.
export const PRIVACY_KEY = "privacy_mode";

function load(): boolean {
  try {
    return localStorage.getItem(PRIVACY_KEY) === "on";
  } catch {
    return false;
  }
}

const [privateMode, setPrivateModeSignal] = createSignal(
  typeof window === "undefined" ? false : load(),
);
// Items revealed one by one while private mode is on. In memory only, and
// cleared whenever the mode is switched on again.
const [revealed, setRevealed] = createSignal<Set<string>>(new Set());

export function setPrivateMode(on: boolean): void {
  setPrivateModeSignal(on);
  setRevealed(new Set<string>());
  try {
    if (on) localStorage.setItem(PRIVACY_KEY, "on");
    else localStorage.removeItem(PRIVACY_KEY);
  } catch {
    // storage unavailable; the choice lasts for this session
  }
}

export function togglePrivateMode(): void {
  setPrivateMode(!privateMode());
}

export function reveal(id: string): void {
  setRevealed((s) => new Set(s).add(id));
}

// True when `id` should be veiled right now.
export function isVeiled(id: string): boolean {
  return privateMode() && !revealed().has(id);
}

export { privateMode };
