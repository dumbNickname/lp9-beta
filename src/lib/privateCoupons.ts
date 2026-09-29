import { createSignal } from "solid-js";

// Per-device, per-user private coupon flags (DESIGN.md §15b, D-38.1).
// Plain signal mirrored to localStorage; never synced to the server.
const KEY = "private_coupons";

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

const [privateIds, setPrivateIds] = createSignal<Set<string>>(
  typeof window === "undefined" ? new Set() : load(),
);

export function isCouponPrivate(id: string): boolean {
  return privateIds().has(id);
}

export function toggleCouponPrivate(id: string): void {
  const next = new Set(privateIds());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setPrivateIds(next);
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    // storage unavailable; flag lasts for this session only
  }
}

export function reloadPrivateCoupons(): void {
  setPrivateIds(load());
}
