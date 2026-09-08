"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CheckoutSteps from "@/components/CheckoutSteps";
import { useCart, formatLength } from "@/lib/cart";
import { useCheckout, saveCheckout } from "@/lib/checkout";
import { toman } from "@/lib/products";
import { createOrderAction } from "@/lib/orderActions";
import { validateCouponAction, type CouponResult } from "@/lib/couponActions";
import { orderNumber } from "@/lib/orders";

/**
 * Step 3 — recap everything before "paying": items, delivery details and the
 * amount due. The gateway is a demo, but the recap is what makes the step
 * trustworthy — a shopper should never be asked to pay without seeing
 * exactly what for.
 */
export default function CheckoutClient() {
  const { items, subtotal, cartDiscount, total, shipping, productFor, lineTotal, clear } = useCart();
  const info = useCheckout();
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [couponInfo, setCouponInfo] = useState<Extract<CouponResult, { ok: true }> | null>(null);
  const couponCode = info?.coupon ?? "";

  // re-validate the coupon carried from the cart so the recap matches the order
  useEffect(() => {
    if (!couponCode) return;
    let alive = true;
    validateCouponAction(couponCode, total).then((r) => alive && setCouponInfo(r.ok ? r : null)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [couponCode, total]);

  const couponDiscount = couponInfo?.discountToman ?? 0;
  const shippingFee = couponInfo?.kind === "free_shipping" ? 0 : shipping.fee;
  const payable = Math.max(0, total - couponDiscount) + shippingFee;

  const fa = (n: number) => n.toLocaleString("fa-IR");

  // Creates the order in the admin's order store (§8 "checkout creates Order").
  // The gateway itself isn't connected yet, so the payment is recorded as a
  // simulated success and the order lands in «پرداخت‌شده» for staff to prepare.
  const pay = async () => {
    if (!info) return;
    setPaying(true);
    setPayError(null);
    try {
      const lines = items
        .map((it) => {
          const p = productFor(it);
          if (!p) return null;
          return { slug: p.slug, qty: p.unit === "متر" ? it.meter + it.centimeter / 100 : it.meter };
        })
        .filter((l): l is { slug: string; qty: number } => !!l);
      const { key } = await createOrderAction({
        customer: { name: info.name, phone: info.mobile || info.phone, nationalCode: info.melicode || undefined, referral: info.referral || undefined },
        delivery:
          info.method === "shipping"
            ? { type: "post", carrier: "پست پیشتاز", recipient: info.name, mobile: info.mobile, landline: info.landline || undefined, province: info.state, city: info.city, postcode: info.postcode, address: info.address }
            : { type: "pickup", day: info.pickupDay, hour: info.pickupHour, cod: false },
        lines,
        couponCode: couponInfo?.code,
        paymentMethod: "zarinpal",
        source: "web",
      });
      saveCheckout({ coupon: "" });
      clear();
      setOrderNo(orderNumber(key));
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "ثبت سفارش انجام نشد");
    } finally {
      setPaying(false);
    }
  };

  if (orderNo) {
    return (
      <main className="page-bg min-h-[calc(100vh-64px)] px-4 pb-12 pt-10 lg:pt-16">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf7dc] text-2xl text-[#5c9a00]">
            ✓
          </span>
          <p className="mt-4 text-base font-bold">سفارش شما ثبت شد</p>
          <p className="mt-2 text-xs leading-6 text-modi-gray-900">
            شماره سفارش <span className="font-bold text-[#2b2740]">{orderNo}</span>.
            جزئیات و زمان ارسال پیامک می‌شود.
          </p>
          <p className="mt-3 text-[11px] text-modi-gray-900">
            (درگاه پرداخت هنوز متصل نیست — پرداخت به‌صورت آزمایشی ثبت شد.)
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/my-account/orders" className="inline-flex h-11 items-center justify-center rounded-xl bg-modi-purple-800 text-sm text-white">
              پیگیری سفارش
            </Link>
            <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-xl bg-modi-purple-200 text-sm text-modi-purple-800">
              ادامه خرید
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="page-bg min-h-[calc(100vh-64px)] px-4 pb-12 pt-10">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
          <p className="text-sm font-bold">سبد خرید شما خالی است</p>
          <Link href="/shop" className="mt-4 inline-flex h-10 items-center rounded-xl bg-modi-purple-800 px-6 text-sm text-white">
            مشاهده فروشگاه
          </Link>
        </div>
      </main>
    );
  }

  const card = "rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]";

  return (
    <main className="page-bg pb-6 lg:pb-16">
      <section id="title-cart">
        <div className="flex h-14 items-center bg-white px-4 font-bold shadow-sm lg:h-16 lg:px-8 lg:text-lg">
          پرداخت
        </div>
      </section>
      <CheckoutSteps current={3} />

      <div className="space-y-4 px-4 pt-2 lg:mx-auto lg:max-w-xl lg:px-8 lg:pt-4">
        {/* items */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <Link href="/cart" className="text-xs text-modi-purple-800">
              ویرایش
            </Link>
            <p className="text-sm font-bold">
              خلاصه سفارش{" "}
              <span className="font-normal text-modi-gray-900">
                ({fa(items.length)} کالا)
              </span>
            </p>
          </div>
          <ul className="divide-y divide-modi-gray-500">
            {items.map((it) => {
              const p = productFor(it);
              if (!p) return null;
              const qty = formatLength(it.meter, it.centimeter, p.unit);
              return (
                <li key={it.productId} className="flex items-center gap-3 py-3">
                  <Image
                    src={p.image}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="mt-0.5 text-[11px] text-modi-gray-900">{qty}</p>
                  </div>
                  <p className="shrink-0 text-xs font-bold">{toman(lineTotal(it))}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* delivery */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <Link href="/address" className="text-xs text-modi-purple-800">
              ویرایش
            </Link>
            <p className="text-sm font-bold">تحویل</p>
          </div>
          {info ? (
            info.method === "shipping" ? (
              <div className="text-xs leading-6 text-gray-700">
                <p className="font-bold text-[#2b2740]">{info.name}</p>
                <p>
                  {info.state}، {info.city}، {info.address}
                </p>
                <p dir="ltr" className="text-right">
                  {info.mobile} · کد پستی {info.postcode}
                </p>
              </div>
            ) : (
              <div className="text-xs leading-6 text-gray-700">
                <p className="font-bold text-[#2b2740]">دریافت حضوری — {info.name}</p>
                <p>
                  {info.pickupDay}، ساعت {info.pickupHour}
                </p>
              </div>
            )
          ) : (
            <Link href="/address" className="text-xs text-modi-purple-800">
              آدرس تحویل را وارد کنید ←
            </Link>
          )}
        </section>

        {/* totals */}
        <section className={card}>
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <dd>{toman(subtotal)}</dd>
              <dt className="text-modi-gray-900">جمع کالاها</dt>
            </div>
            {cartDiscount.toman > 0 && (
              <div className="flex items-center justify-between">
                <dd className="text-[#C40000]">− {toman(cartDiscount.toman)}</dd>
                <dt className="text-modi-gray-900">{cartDiscount.label}</dt>
              </div>
            )}
            {couponInfo && couponDiscount > 0 && (
              <div className="flex items-center justify-between">
                <dd className="text-[#C40000]">− {toman(couponDiscount)}</dd>
                <dt className="text-modi-gray-900">کد تخفیف «{couponInfo.code}»</dt>
              </div>
            )}
            <div className="flex items-center justify-between">
              <dd className={shippingFee === 0 ? "font-bold text-[#5c9a00]" : ""}>{shippingFee === 0 ? "رایگان" : toman(shippingFee)}</dd>
              <dt className="text-modi-gray-900">هزینه ارسال</dt>
            </div>
            <div className="flex items-center justify-between border-t border-modi-gray-500 pt-2 text-sm">
              <dd className="font-bold">{toman(payable)}</dd>
              <dt className="font-bold">مبلغ قابل پرداخت</dt>
            </div>
          </dl>
        </section>

        <p className="flex items-center justify-center gap-2 text-[11px] text-modi-gray-900">
          <Image src="/img/enamad.png" alt="نماد اعتماد الکترونیکی" width={125} height={136} className="h-8 w-auto" />
          پرداخت امن از طریق درگاه بانکی
        </p>
      </div>

      <section
        id="footer-cart"
        className="fixed bottom-0 left-0 w-full lg:static lg:mx-auto lg:mt-6 lg:max-w-xl lg:px-8"
      >
        <div className="border-t border-modi-gray-500 bg-white p-4 lg:rounded-2xl lg:border-0 lg:shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
          {payError && <p className="mb-2 text-center text-[11px] text-[#C40000]">{payError}</p>}
          <button
            type="button"
            disabled={!info || paying}
            onClick={() => {
              saveCheckout({});
              pay();
            }}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-modi-purple-800 text-sm font-bold text-white disabled:opacity-50"
          >
            {paying ? "در حال ثبت سفارش…" : `پرداخت ${toman(payable)}`}
          </button>
        </div>
      </section>
    </main>
  );
}
