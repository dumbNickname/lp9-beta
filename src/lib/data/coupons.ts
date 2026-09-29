import { supabase } from "~/lib/supabase";
import type { Coupon, CouponInput } from "./types";

export const PRICE_MIN = 1;
export const PRICE_MAX = 50;
export const TITLE_MAX = 80;
export const TEXT_MAX = 300;

const COLUMNS =
  "id, relationship_id, receiver_id, giver_id, title, description, boundaries_note, emoji, price, status, decline_note, template_key, created_at, approved_at, declined_at, retired_at";

function fieldArgs(input: CouponInput) {
  return {
    p_title: input.title,
    p_description: input.description ?? null,
    p_boundaries: input.boundaries_note ?? null,
    p_emoji: input.emoji ?? null,
    p_price: input.price,
  };
}

export async function listCoupons(relId: string): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select(COLUMNS)
    .eq("relationship_id", relId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Coupon[];
}

export async function submitCoupon(
  relId: string,
  input: CouponInput,
  templateKey: string | null = null,
): Promise<string> {
  const { data, error } = await supabase.rpc("submit_coupon", {
    p_rel_id: relId,
    ...fieldArgs(input),
    p_template_key: templateKey,
  });
  if (error) throw error;
  return data as string;
}

export async function updateCouponDraft(couponId: string, input: CouponInput): Promise<void> {
  const { error } = await supabase.rpc("update_coupon_draft", {
    p_coupon_id: couponId,
    ...fieldArgs(input),
  });
  if (error) throw error;
}

async function simple(fn: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw error;
}

export const deleteCoupon = (id: string) => simple("delete_coupon", { p_coupon_id: id });
export const approveCoupon = (id: string) => simple("approve_coupon", { p_coupon_id: id });
export const retireCoupon = (id: string) => simple("retire_coupon", { p_coupon_id: id });
export const declineCoupon = (id: string, note: string | null) =>
  simple("decline_coupon", { p_coupon_id: id, p_note: note });

const FRIENDLY: [string, string][] = [
  ["invalid title", `Give it a title (up to ${TITLE_MAX} characters).`],
  ["invalid price", `Price must be between ${PRICE_MIN} and ${PRICE_MAX} hearts.`],
  ["invalid field", "One of the fields is too long."],
  ["invalid status", "This coupon changed in the meantime. Refresh and try again."],
  ["not the receiver", "Only the person who wished for this can change it."],
  ["not the giver", "Only your partner can approve this."],
  ["relationship not active", "This relationship is no longer active."],
  ["not found", "This coupon no longer exists."],
];

export function friendlyCouponError(err: unknown): string {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err ?? "");
  for (const [needle, text] of FRIENDLY) {
    if (msg.includes(needle)) return text;
  }
  return "Something went wrong. Please try again.";
}
