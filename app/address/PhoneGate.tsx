"use client";

import { useEffect, useState } from "react";
import CheckoutSteps from "@/components/CheckoutSteps";
import { normalizeMobile } from "@/lib/checkout";

const RESEND_SECONDS = 60;

/**
 * Checkout step 1 (تعیین آدرس): verify the shopper's mobile number with an
 * SMS one-time code before the address form appears. One normal `tel` field
 * (paste works, any of 0912…, 912…, +98912… is accepted), then a code field
 * with a resend countdown. Demo only — any 4-digit code is accepted.
 */
export default function PhoneGate({
  onVerified,
}: {
  onVerified: (phone: string) => void;
}) {
  const [phase, setPhase] = useState<"phone" | "code">("phone");
  const [raw, setRaw] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0);

  const phone = normalizeMobile(raw);

  useEffect(() => {
    if (phase !== "code" || left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, left]);

  const requestCode = () => {
    if (!phone) {
      setError("شماره موبایل معتبر نیست. مثال: ۰۹۱۲۳۴۵۶۷۸۹");
      return;
    }
    setError("");
    setCode("");
    setLeft(RESEND_SECONDS);
    setPhase("code");
  };

  const verify = () => {
    if (code.length < 4) {
      setError("کد تایید را کامل وارد کنید.");
      return;
    }
    setError("");
    onVerified(phone);
  };

  const fa = (n: number) => n.toLocaleString("fa-IR");

  return (
    <main className="page-bg min-h-[calc(100vh-64px)] pb-10">
      <div className="flex h-14 items-center bg-white px-4 font-bold shadow-sm lg:h-16 lg:px-8 lg:text-lg">
        تعیین آدرس
      </div>
      <CheckoutSteps current={2} />

      <div className="relative mx-4 mt-10 rounded-2xl bg-white px-5 pb-6 pt-10 text-center shadow-[0_2px_20px_-10px_rgba(43,39,64,0.3)] lg:mx-auto lg:mt-14 lg:max-w-md lg:px-8 lg:pb-8">
        <span className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
            <rect x="6" y="2" width="12" height="20" rx="2" fill="none" stroke="#6b3fa0" strokeWidth="1.6" />
            <path d="M9.5 13.5l1.8 1.8 3.7-3.8" fill="none" stroke="#6b3fa0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        {phase === "phone" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestCode();
            }}
          >
            <p className="text-sm font-bold leading-7">شماره موبایل خود را وارد کنید</p>
            <p className="mt-1 text-xs leading-6 text-modi-gray-900">
              کد تایید به این شماره پیامک می‌شود.
            </p>
            <label className="sr-only" htmlFor="phone">
              شماره موبایل
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              dir="ltr"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              aria-invalid={!!error}
              placeholder="0912 345 6789"
              className="mt-4 h-12 w-full rounded-xl border border-modi-gray-500 bg-modi-gray-300 px-4 text-center text-lg tracking-widest outline-none focus:border-modi-purple-500 focus:bg-white placeholder:text-modi-gray-900/70 placeholder:tracking-normal"
            />
            {error && (
              <p role="alert" className="mt-2 text-xs text-[#d9463e]">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="mt-4 h-11 w-full rounded-xl bg-modi-purple-800 text-sm font-bold text-white"
            >
              دریافت کد تایید
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            <p className="text-sm font-bold">کد تایید را وارد کنید</p>
            <p className="mt-1 text-xs text-modi-gray-900">
              کد به شماره{" "}
              <span dir="ltr" className="font-bold text-[#2b2740]">
                {phone}
              </span>{" "}
              پیامک شد.
            </p>
            <label className="sr-only" htmlFor="otp">
              کد تایید
            </label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-invalid={!!error}
              placeholder="- - - -"
              className="mt-4 h-12 w-full rounded-xl border border-modi-gray-500 bg-modi-gray-300 text-center text-xl tracking-[0.5em] outline-none focus:border-modi-purple-500 focus:bg-white"
            />
            {error && (
              <p role="alert" className="mt-2 text-xs text-[#d9463e]">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="mt-4 h-11 w-full rounded-xl bg-modi-purple-800 text-sm font-bold text-white"
            >
              تایید و ادامه
            </button>

            <div className="mt-3 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setPhase("phone");
                  setError("");
                }}
                className="text-modi-purple-800"
              >
                ویرایش شماره
              </button>
              {left > 0 ? (
                <span className="text-modi-gray-900">
                  ارسال مجدد تا {fa(left)} ثانیه دیگر
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setLeft(RESEND_SECONDS)}
                  className="text-modi-purple-800"
                >
                  ارسال مجدد کد
                </button>
              )}
            </div>
            <p className="mt-4 text-[11px] text-modi-gray-900">
              نسخه نمایشی: هر کد ۴ رقمی پذیرفته می‌شود.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
