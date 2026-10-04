import { createSignal } from "solid-js";
import { readJson, writeLocal } from "~/lib/storage";

// Per-device, per-user private coupon flags (DESIGN.md §15b, D-38.1).
// Plain signal mirrored to localStorage; never synced to the server.
export const PRIVATE_COUPONS_KEY = "private_coupons";

function load(): Set<string> {
  const arr = readJson<unknown>(PRIVATE_COUPONS_KEY);
  return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
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
  writeLocal(PRIVATE_COUPONS_KEY, JSON.stringify([...next]));
}

export function reloadPrivateCoupons(): void {
  setPrivateIds(load());
}
