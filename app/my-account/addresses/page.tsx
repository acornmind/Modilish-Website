"use client";

import Link from "next/link";
import { useCheckout } from "@/lib/checkout";

export default function AddressesPage() {
  const info = useCheckout();
  const hasAddress = !!info && (info.method === "no-shipping" || !!info.address);

  return (
    <div className="text-right">
      <h2 className="text-sm font-bold">آدرس‌های من</h2>

      {hasAddress && info ? (
        <div className="mt-4 rounded-2xl bg-modi-gray-300 p-4 text-xs leading-6">
          <p className="font-bold text-[#2b2740]">{info.name}</p>
          {info.method === "shipping" ? (
            <>
              <p>
                {info.state}، {info.city}، {info.address}
              </p>
              <p dir="ltr" className="text-right text-modi-gray-900">
                {info.mobile} · کد پستی {info.postcode}
              </p>
            </>
          ) : (
            <p className="text-modi-gray-900">
              دریافت حضوری — {info.pickupDay}، ساعت {info.pickupHour}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-6 text-modi-gray-900">
          هنوز آدرسی ثبت نکرده‌اید. آدرس هنگام اولین خرید ذخیره می‌شود و در
          خریدهای بعدی به‌صورت خودکار پر می‌شود.
        </p>
      )}

      <Link
        href="/address"
        className="mt-4 inline-flex h-9 items-center rounded-lg bg-modi-purple-200 px-4 text-xs text-modi-purple-800"
      >
        {hasAddress ? "ویرایش آدرس" : "افزودن آدرس"}
      </Link>
    </div>
  );
}
