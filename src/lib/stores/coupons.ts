import { createSignal } from "solid-js";
import {
  approveCoupon,
  declineCoupon,
  deleteCoupon,
  listCoupons,
  retireCoupon,
  submitCoupon,
  updateCouponDraft,
} from "~/lib/data/coupons";
import type { Coupon, CouponInput } from "~/lib/data/types";

const [coupons, setCoupons] = createSignal<Coupon[]>([]);
const [couponsLoading, setCouponsLoading] = createSignal(false);
const [couponsError, setCouponsError] = createSignal(false);

let currentRel: string | null = null;

export async function refreshCoupons(relId: string): Promise<void> {
  currentRel = relId;
  setCouponsLoading(true);
  try {
    const rows = await listCoupons(relId);
    if (currentRel === relId) setCoupons(rows);
    setCouponsError(false);
  } catch {
    setCouponsError(true);
  } finally {
    setCouponsLoading(false);
  }
}

async function after<T>(p: Promise<T>): Promise<T> {
  const r = await p;
  if (currentRel) await refreshCoupons(currentRel);
  return r;
}

export const addCoupon = (relId: string, input: CouponInput, templateKey: string | null = null) =>
  after(submitCoupon(relId, input, templateKey));
export const editCoupon = (id: string, input: CouponInput) => after(updateCouponDraft(id, input));
export const removeCoupon = (id: string) => after(deleteCoupon(id));
export const approve = (id: string) => after(approveCoupon(id));
export const decline = (id: string, note: string | null) => after(declineCoupon(id, note));
export const retire = (id: string) => after(retireCoupon(id));

export function resetCoupons(): void {
  currentRel = null;
  setCoupons([]);
}

export function refreshCurrentCoupons(): void {
  if (currentRel) void refreshCoupons(currentRel);
}

export { coupons, couponsLoading, couponsError };
