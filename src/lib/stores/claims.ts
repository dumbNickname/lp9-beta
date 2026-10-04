import { createSignal } from "solid-js";
import {
  acceptClaim,
  cancelClaim,
  claimCoupon,
  declineClaim,
  deliverClaim,
  listClaims,
  nudgeClaim,
  sweepExpiredClaims,
  withdrawClaim,
} from "~/lib/data/claims";
import type { Claim } from "~/lib/data/types";

const [claims, setClaims] = createSignal<Claim[]>([]);
const [claimsError, setClaimsError] = createSignal(false);

let currentRel: string | null = null;
let seq = 0;

export async function refreshClaims(relId: string): Promise<void> {
  currentRel = relId;
  const my = ++seq;
  try {
    // Lazy 14-day auto-refund before reading (§5f). Failure is non-fatal.
    await sweepExpiredClaims(relId).catch(() => 0);
    const rows = await listClaims(relId);
    if (my !== seq) return;
    setClaims(rows);
    setClaimsError(false);
  } catch {
    if (my === seq) setClaimsError(true);
  }
}

export function resetClaims(): void {
  currentRel = null;
  seq++;
  setClaims([]);
  setClaimsError(false);
}

async function after<T>(p: Promise<T>): Promise<T> {
  const r = await p;
  if (currentRel) await refreshClaims(currentRel);
  return r;
}

export const claim = (couponId: string) => after(claimCoupon(couponId));
export const accept = (id: string, date: string | null, note: string | null) =>
  after(acceptClaim(id, date, note));
export const declineC = (id: string, reason: string | null) => after(declineClaim(id, reason));
export const deliver = (id: string) => after(deliverClaim(id));
export const withdraw = (id: string) => after(withdrawClaim(id));
export const cancel = (id: string, note: string | null) => after(cancelClaim(id, note));
export const nudge = (id: string) => after(nudgeClaim(id));

const OPEN: Claim["status"][] = ["pending", "accepted"];
export const isOpen = (c: Claim) => OPEN.includes(c.status);

export function myClaims(userId: string): Claim[] {
  return claims().filter((c) => c.claimer_id === userId);
}

export function openClaimFor(couponId: string): Claim | undefined {
  return claims().find((c) => c.coupon_id === couponId && isOpen(c));
}

export function myEscrow(userId: string): number {
  return myClaims(userId)
    .filter(isOpen)
    .reduce((s, c) => s + c.price_at_claim, 0);
}

export { claims, claimsError };
