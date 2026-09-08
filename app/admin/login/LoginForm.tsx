"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { requestOtpAction, verifyOtpAction } from "@/lib/authActions";

const faDigits = (s: string) => s.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)));

/** Two steps: phone → 6-digit code, with resend timer and attempt feedback (§2.2). */
export default function LoginForm({ smsConnected, ownerHint }: { smsConnected: boolean; ownerHint: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | undefined>();
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const request = () =>
    start(async () => {
      setError(null);
      const r = await requestOtpAction(phone);
      if (!r.ok) return setError(r.message);
      setDemoCode(r.demoCode);
      setResendIn(r.resendIn);
      setStep("code");
      setCode("");
    });

  const verify = () =>
    start(async () => {
      setError(null);
      const r = await verifyOtpAction(phone, code);
      if (!r.ok) return setError(r.message);
      router.replace("/admin");
      router.refresh();
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (step === "phone") request();
        else if (faDigits(code).length === 6) verify();
      }}
      className="space-y-3"
    >
      {step === "phone" ? (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-bold">شماره موبایل</span>
            <input
              type="tel"
              inputMode="tel"
              autoFocus
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              dir="ltr"
              className="h-11 w-full rounded-xl bg-modi-gray-300 px-3 text-center text-sm tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500"
            />
          </label>
          <button type="submit" disabled={pending || faDigits(phone).replace(/\D/g, "").length < 10} className="h-11 w-full rounded-xl bg-modi-purple-800 text-sm font-bold text-white hover:bg-modi-purple-500 disabled:opacity-60">
            {pending ? "در حال ارسال…" : "دریافت کد"}
          </button>
          {!smsConnected && ownerHint && (
            <p className="rounded-xl bg-modi-info-bg px-3 py-2 text-[11px] leading-5 text-modi-info">
              کاوه‌نگار متصل نیست؛ کد به‌جای پیامک همین‌جا نمایش داده می‌شود. شماره مالک: <span dir="ltr" className="font-bold tabular-nums">{ownerHint}</span>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-center text-xs text-modi-gray-900">
            کد ۶ رقمی به <span dir="ltr" className="font-bold tabular-nums">{phone}</span> فرستاده شد.{" "}
            <button type="button" onClick={() => { setStep("phone"); setError(null); }} className="font-bold text-modi-purple-800">تغییر شماره</button>
          </p>
          {demoCode && (
            <p className="rounded-xl bg-modi-warning-bg px-3 py-2 text-center text-xs leading-6 text-modi-warning">
              حالت نمایشی — کد ورود: <span dir="ltr" className="text-base font-bold tracking-[0.3em] tabular-nums">{demoCode}</span>
            </p>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-bold">کد تایید</span>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="——————"
              dir="ltr"
              className="h-11 w-full rounded-xl bg-modi-gray-300 px-3 text-center text-lg tracking-[0.4em] tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500"
            />
          </label>
          <button type="submit" disabled={pending || faDigits(code).length !== 6} className="h-11 w-full rounded-xl bg-modi-purple-800 text-sm font-bold text-white hover:bg-modi-purple-500 disabled:opacity-60">
            {pending ? "در حال بررسی…" : "ورود"}
          </button>
          <button type="button" disabled={pending || resendIn > 0} onClick={request} className="h-9 w-full rounded-xl text-xs font-bold text-modi-purple-800 disabled:text-modi-gray-900">
            {resendIn > 0 ? `ارسال دوباره تا ${resendIn.toLocaleString("fa-IR")} ثانیه` : "ارسال دوباره کد"}
          </button>
        </>
      )}
      {error && <p className="rounded-xl bg-modi-danger-bg px-3 py-2 text-center text-xs font-bold text-modi-danger">{error}</p>}
      <p className="pt-1 text-center text-[11px] leading-5 text-modi-gray-900">ورود ۳۰ روز معتبر می‌ماند. برای خروج از همه دستگاه‌ها از منوی کاربر استفاده کنید.</p>
    </form>
  );
}
