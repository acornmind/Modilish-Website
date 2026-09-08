"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";
import CheckoutSteps from "@/components/CheckoutSteps";
import {
  useCart,
  formatLength,
  type CartItem,
  lastAddedId,
  clearLastAdded,
} from "@/lib/cart";
import { toman, products } from "@/lib/products";
import { validateCouponAction, type CouponResult } from "@/lib/couponActions";
import { getCheckout, saveCheckout } from "@/lib/checkout";
import { useStrings } from "@/lib/cart";

const METERS = Array.from({ length: 11 }, (_, i) => i);
const CM = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

export default function CartClient() {
  const { items, remove, update, clear, subtotal, cartDiscount, cartHint, total, shipping, productFor, lineTotal } =
    useCart();
  const t = useStrings();
  const [editKey, setEditKey] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [coupon, setCoupon] = useState(() => getCheckout()?.coupon ?? "");
  const [couponMsg, setCouponMsg] = useState("");
  const [applied, setApplied] = useState<Extract<CouponResult, { ok: true }> | null>(null);
  const [checking, setChecking] = useState(false);

  // Validates against Marketing → کدهای تخفیف in the admin (§4.11.2); the
  // accepted code travels with the checkout info so the order records it.
  const applyCoupon = async () => {
    setChecking(true);
    try {
      const res = await validateCouponAction(coupon, total);
      if (res.ok) {
        setApplied(res);
        setCouponMsg("");
        saveCheckout({ coupon: res.code });
      } else {
        setApplied(null);
        setCouponMsg(res.message);
        saveCheckout({ coupon: "" });
      }
    } catch {
      setCouponMsg("بررسی کد ممکن نشد — دوباره تلاش کنید.");
    } finally {
      setChecking(false);
    }
  };
  const discount = applied?.discountToman ?? 0;
  const shippingFee = applied?.kind === "free_shipping" ? 0 : shipping.fee;
  const payable = Math.max(0, total - discount) + shippingFee;
  const [added] = useState(() =>
    products.find((p) => p.id === lastAddedId()),
  );
  const [showAdded, setShowAdded] = useState(!!added);

  if (items.length === 0) {
    return (
      <main className="page-bg">
        <section id="title-cart">
          <div className="flex h-14 items-center justify-between gap-4 bg-white px-4 shadow-sm">
            <div className="font-bold">سبد خرید</div>
          </div>
        </section>
        <div className="flex w-full flex-col items-center pb-16 pt-10">
          <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md shadow-modi-gray-50">
            <svg width="11" height="40" viewBox="0 0 11 62.367" aria-hidden>
              <line
                y2="40"
                transform="translate(5.5 3.5)"
                fill="none"
                stroke="#a58bc5"
                strokeLinecap="round"
                strokeWidth="7"
              />
              <circle cx="5.5" cy="56.8" r="5.5" fill="#a58bc5" />
            </svg>
          </span>
          <p>{t("cartEmpty", "سبد خرید خالی است!")}</p>
          <Link
            href="/shop"
            className="m-4 flex h-9 items-center justify-center rounded-lg bg-modi-purple-200 px-4 text-sm text-modi-purple-800"
          >
            مشاهده فروشگاه
          </Link>
        </div>
      </main>
    );
  }

  const summaryPanel = (
    <>
      <div className="flex items-center justify-between gap-2 bg-white px-4 py-2 lg:flex-col lg:items-stretch lg:gap-3 lg:rounded-t-2xl lg:px-5 lg:pt-5">
        <span className="flex basis-1/2 text-xs lg:basis-auto lg:text-sm lg:font-bold">
          {t("couponPrompt", "کد تخفیف دارید؟ وارد کنید")}
        </span>
        <div className="flex basis-1/2 gap-2 lg:basis-auto">
          <input
            type="text"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="کد تخفیف"
            className="w-full rounded-lg border border-gray-300 bg-modi-gray-500 px-2 text-xs outline-none lg:h-10 lg:text-sm"
          />
          <button
            onClick={applyCoupon}
            disabled={checking}
            className="h-8 shrink-0 rounded-lg bg-modi-purple-200 px-3 text-xs text-modi-purple-800 disabled:opacity-60 lg:h-10 lg:px-4 lg:text-sm"
          >
            {checking ? "…" : "اعمال"}
          </button>
        </div>
      </div>
      {couponMsg && (
        <p className="bg-white px-4 pb-1 text-[11px] text-[#C40000] lg:px-5 lg:text-xs">
          {couponMsg}
        </p>
      )}
      {applied && (
        <p className="bg-white px-4 pb-1 text-[11px] text-[#5c9a00] lg:px-5 lg:text-xs">
          کد «{applied.code}» اعمال شد · {applied.label}
        </p>
      )}
      <div className="flex items-center justify-between bg-modi-gray-300 p-4 lg:flex-col lg:items-stretch lg:gap-3 lg:rounded-b-2xl lg:p-5">
        <div className="text-sm font-bold lg:flex lg:flex-col lg:gap-2">
          <div className="hidden items-center justify-between text-xs font-normal lg:flex">
            <span className="text-modi-gray-900">جمع کالاها</span>
            <span>{toman(subtotal)}</span>
          </div>
          {cartDiscount.toman > 0 && (
            <div className="flex items-center justify-between text-xs font-normal">
              <span className="text-modi-gray-900">{cartDiscount.label}</span>
              <span className="text-[#C40000]">− {toman(cartDiscount.toman)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex items-center justify-between text-xs font-normal">
              <span className="text-modi-gray-900">کد تخفیف</span>
              <span className="text-[#C40000]">− {toman(discount)}</span>
            </div>
          )}
          <div className="hidden items-center justify-between text-xs font-normal lg:flex">
            <span className="text-modi-gray-900">هزینه ارسال</span>
            {shippingFee === 0 ? (
              <span className="font-bold text-[#5c9a00]">
                {shipping.fee > 0 && <del className="me-1 font-normal text-modi-gray-900">{toman(shipping.fee)}</del>}
                {t("freeShipping", "رایگان")}
              </span>
            ) : (
              <span>{toman(shippingFee)}</span>
            )}
          </div>
          <div className="lg:flex lg:items-center lg:justify-between lg:border-t lg:border-modi-gray-500 lg:pt-2">
            <span className="text-modi-gray-900">مبلغ کل: </span>
            <span>{toman(payable)}</span>
          </div>
          <span className="block text-[10px] font-normal text-[#5c9a00] lg:hidden">
            {shippingFee === 0 ? `ارسال ${t("freeShipping", "رایگان")}` : `ارسال ${toman(shippingFee)}`}
          </span>
          {(cartHint || shipping.hint) && (
            <span className="block text-[10px] font-normal text-modi-purple-800">{cartHint || shipping.hint}</span>
          )}
        </div>
        <Link
          href="/address"
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-modi-purple-800 px-5 text-sm text-white lg:h-11 lg:w-full"
        >
          <span>تایید و ادامه</span>
          <svg width="7" height="11" viewBox="0 0 6.867 10.906" aria-hidden>
            <path
              d="M5.5 1.4l-4 4 4 4"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </div>
    </>
  );

  return (
    <main className="page-bg pb-6 lg:pb-16">
      <section id="title-cart">
        <div className="flex h-14 items-center justify-between gap-4 bg-white px-4 shadow-sm lg:h-16 lg:px-8">
          <div className="modi-container flex items-center justify-between gap-4 px-0">
            <div className="font-bold lg:text-lg">سبد خرید</div>
            {confirmClear ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-modi-gray-900">همه حذف شود؟</span>
                <button
                  onClick={() => {
                    clear();
                    setConfirmClear(false);
                  }}
                  className="h-8 rounded-lg bg-[#FFE3E3] px-3 text-[#C40000]"
                >
                  بله، حذف کن
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="h-8 rounded-lg bg-modi-gray-500 px-3 text-gray-800"
                >
                  انصراف
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex h-8 items-center justify-center rounded-lg bg-modi-purple-200 px-3 text-xs text-modi-purple-800"
              >
                خالی کردن سبد خرید
              </button>
            )}
          </div>
        </div>
      </section>
      <CheckoutSteps current={1} />

      <div className="modi-container px-4 pb-4 pt-2 lg:flex lg:items-start lg:gap-8 lg:px-8 lg:py-8">
        <div className="min-w-0 flex-1">
          {showAdded && added && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border-r-4 border-[#7fb800] bg-white p-3 shadow-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7fb800] text-white">
                ✓
              </span>
              <div className="flex-1 text-right text-xs">
                <span>«{added.name}» به سبد خرید شما اضافه شد.</span>
                <button
                  onClick={() => {
                    setShowAdded(false);
                    clearLastAdded();
                  }}
                  className="mt-1 block rounded-full bg-[#7fb800] px-3 py-1 text-white"
                >
                  متوجه شدم
                </button>
              </div>
            </div>
          )}

          <div className="modilish-cart-form flex flex-col gap-2">
            {items.map((item) => {
              const p = productFor(item);
              if (!p) return null;
              return (
                <div
                  key={item.productId}
                  className="cart_item rounded-2xl bg-white p-3 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:p-4"
                >
                  <div className="flex gap-3">
                    <div className="flex-1 text-right">
                      <Link
                        href={`/product/${p.slug}`}
                        className="text-sm font-bold lg:text-base"
                      >
                        {p.name}
                      </Link>
                      <div className="mt-1 text-[12px] text-modi-gray-900 lg:text-sm">
                        {formatQty(item, p.unit)} — {toman(lineTotal(item))}
                      </div>
                    </div>
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover lg:h-24 lg:w-24"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 lg:max-w-xs">
                    <button
                      onClick={() => remove(item.productId)}
                      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-[#FFE3E3] px-2 text-xs text-[#C40000]"
                    >
                      <Icon src="/img/delete.svg" size={12} />
                      حذف
                    </button>
                    <button
                      onClick={() => setEditKey(item.productId)}
                      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-modi-purple-800 px-2 text-xs text-white"
                    >
                      <Icon src="/img/edit.svg" size={12} />
                      تغییر مقدار
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* mobile summary — sits statically right below the cart items,
              in normal page flow (no fixed/floating position), so the
              footer simply follows after it with no overlap to fix */}
          <div className="mt-4 overflow-hidden rounded-2xl shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:hidden">
            {summaryPanel}
          </div>
        </div>

        {/* desktop order-summary sidebar */}
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:w-80 lg:shrink-0 lg:overflow-hidden lg:rounded-2xl lg:shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
          {summaryPanel}
        </aside>
      </div>

      {editKey !== null &&
        (() => {
          const p = products.find((x) => x.id === editKey);
          const item = items.find((i) => i.productId === editKey);
          if (!p || !item) return null;
          return (
            <ChangeQtyModal
              item={item}
              unit={p.unit}
              meters={p.meters}
              limit={p.limit}
              price={p.salePrice > 0 ? p.salePrice : p.price}
              onClose={() => setEditKey(null)}
              onSave={(m, c) => {
                update(editKey, m, c);
                setEditKey(null);
              }}
            />
          );
        })()}
    </main>
  );
}

function formatQty(item: CartItem, unit: string) {
  return formatLength(item.meter, item.centimeter, unit);
}

function ChangeQtyModal({
  item,
  unit,
  meters,
  limit,
  price,
  onClose,
  onSave,
}: {
  item: CartItem;
  unit: string;
  meters: number;
  limit: number;
  price: number;
  onClose: () => void;
  onSave: (meter: number, centimeter: number) => void;
}) {
  const usesMeters = unit === "متر";
  const [meter, setMeter] = useState(item.meter);
  const [centimeter, setCentimeter] = useState(item.centimeter);
  const order = usesMeters ? meter + centimeter / 100 : meter;
  const err =
    order > meters
      ? "متراژ دلخواه شما از موجودی انبار بیشتر است."
      : order < limit
        ? `حداقل متراژ قابل سفارش ${limit.toLocaleString("fa-IR")} متر می‌باشد!`
        : "";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-[#3131315e] backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[320px] rounded-2xl bg-white px-5 pb-5 pt-10 text-center shadow-xl">
        <span className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-bold text-modi-purple-500 shadow-md">
          !
        </span>
        <p className="text-sm font-bold">تغییر مقدار پارچه</p>

        <div dir="ltr" className="mx-auto mt-4 flex max-w-52 justify-center gap-3">
          <label className="flex flex-col-reverse items-center gap-1 text-xs text-modi-gray-900">
            <select
              className="h-8 w-16 rounded border border-modi-gray-500 bg-modi-gray-300 text-center"
              value={meter}
              onChange={(e) => setMeter(Number(e.target.value))}
            >
              {METERS.map((m) => (
                <option key={m} value={m}>
                  {m.toLocaleString("fa-IR")}
                </option>
              ))}
            </select>
            متر
          </label>
          {usesMeters && (
            <label className="flex flex-col-reverse items-center gap-1 text-xs text-modi-gray-900">
              <select
                className="h-8 w-16 rounded border border-modi-gray-500 bg-modi-gray-300 text-center"
                value={centimeter}
                onChange={(e) => setCentimeter(Number(e.target.value))}
              >
                {CM.map((c) => (
                  <option key={c} value={c}>
                    {c.toLocaleString("fa-IR")}
                  </option>
                ))}
              </select>
              سانتی متر
            </label>
          )}
        </div>

        <div className="mt-4 text-xs">
          <span className="text-modi-gray-900">مبلغ کل: </span>
          <span className="font-bold">{toman(Math.round(price * order))}</span>
        </div>

        {err && (
          <p className="mt-3 rounded-lg bg-[#FFE3E3] p-2 text-xs text-[#C40000]">
            {err}
          </p>
        )}

        <div className="mt-5 flex gap-2 text-sm">
          <button
            disabled={!!err}
            onClick={() => onSave(meter, centimeter)}
            className="h-9 w-1/2 rounded-lg bg-modi-purple-800 px-2 text-white disabled:opacity-50"
          >
            تایید
          </button>
          <button
            onClick={onClose}
            className="h-9 w-1/2 rounded-lg bg-modi-purple-200 px-2 text-modi-purple-800"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}
