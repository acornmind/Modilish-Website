"use server";

import { checkCoupon } from "./orderStore";

export type CouponResult =
  | { ok: true; code: string; kind: "percent" | "fixed" | "free_shipping"; discountToman: number; label: string }
  | { ok: false; message: string };

/** Validates a code against Marketing → کدهای تخفیف (§4.11.2) for the cart's coupon box. */
export async function validateCouponAction(code: string, cartTotalToman: number): Promise<CouponResult> {
  const r = await checkCoupon(code, cartTotalToman);
  if (!r.ok) return r;
  return { ok: true, code: r.coupon.code, kind: r.coupon.kind, discountToman: r.discountToman, label: r.label };
}
