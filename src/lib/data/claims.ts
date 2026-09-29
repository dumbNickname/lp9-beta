import { supabase } from "~/lib/supabase";
import type { Claim } from "./types";

const COLUMNS =
  "id, coupon_id, relationship_id, claimer_id, deliverer_id, price_at_claim, status, scheduled_date, accept_note, decline_reason, cancel_note, cancelled_by, claimed_at, accepted_at, declined_at, delivered_at, withdrawn_at, cancelled_at, auto_refunded_at, nudged_at";

export async function listClaims(relId: string): Promise<Claim[]> {
  const { data, error } = await supabase
    .from("coupon_claims")
    .select(COLUMNS)
    .eq("relationship_id", relId)
    .order("claimed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Claim[];
}

// Lazy 14-day auto-refund (§5f). Returns how many claims were refunded.
export async function sweepExpiredClaims(relId: string): Promise<number> {
  const { data, error } = await supabase.rpc("sweep_expired_claims", { p_rel_id: relId });
  if (error) throw error;
  return (data as number | null) ?? 0;
}

export async function claimCoupon(couponId: string): Promise<string> {
  const { data, error } = await supabase.rpc("claim_coupon", { p_coupon_id: couponId });
  if (error) throw error;
  return data as string;
}

async function call(fn: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw error;
}

export const acceptClaim = (id: string, date: string | null, note: string | null) =>
  call("accept_claim", { p_claim_id: id, p_date: date, p_note: note });
export const declineClaim = (id: string, reason: string | null) =>
  call("decline_claim", { p_claim_id: id, p_reason: reason });
export const deliverClaim = (id: string) => call("deliver_claim", { p_claim_id: id });
export const withdrawClaim = (id: string) => call("withdraw_claim", { p_claim_id: id });
export const cancelClaim = (id: string, note: string | null) =>
  call("cancel_claim", { p_claim_id: id, p_note: note });
export const nudgeClaim = (id: string) => call("nudge_claim", { p_claim_id: id });

const FRIENDLY: [string, string][] = [
  ["not enough hearts", "You don't have enough hearts for this one yet."],
  ["already claimed", "You've already claimed this — wait until it's delivered."],
  ["coupon not available", "This coupon isn't available right now."],
  ["too early to nudge", "You can send a gentle reminder after 7 days."],
  ["already nudged", "You already sent a reminder today."],
  ["invalid date", "Pick a date within the next year."],
  ["invalid status", "This changed in the meantime. Refresh and try again."],
  ["invalid field", "That note is too long."],
  ["not the deliverer", "Only your partner can do that."],
  ["not the claimer", "Only the person who claimed it can do that."],
  ["not the receiver", "Only the person who wished for this can claim it."],
  ["relationship not active", "This relationship is no longer active."],
  ["not found", "This no longer exists."],
];

export function friendlyClaimError(err: unknown): string {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err ?? "");
  for (const [needle, text] of FRIENDLY) {
    if (msg.includes(needle)) return text;
  }
  return "Something went wrong. Please try again.";
}
