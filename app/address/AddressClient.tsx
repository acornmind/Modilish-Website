"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CheckoutSteps from "@/components/CheckoutSteps";
import { nextDeliveryDays } from "@/lib/iran";
import type { SiteSettings } from "@/lib/siteContent";
import {
  getCheckout,
  saveCheckout,
  normalizeMobile,
  isPostcode,
  isMelicode,
  type DeliveryMethod,
} from "@/lib/checkout";
import PhoneGate from "./PhoneGate";

type Form = {
  name: string;
  melicode: string;
  referral: string;
  mobile: string;
  state: string;
  city: string;
  landline: string;
  postcode: string;
  address: string;
  pickupDay: string;
  pickupHour: string;
};

const fieldCls =
  "h-10 w-full rounded-lg border-0 bg-modi-gray-300 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500";
const labelCls = "mb-1.5 block text-xs font-bold text-[#2b2740]";

/** Label + control + inline error. Lives outside the form component so the
 *  inputs keep their identity (and focus) across re-renders. */
function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className={`${labelCls} ${required ? "require" : ""}`}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`e-${id}`} role="alert" className="mt-1 text-[11px] text-[#d9463e]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Delivery options (provinces, pickup days/hours, default province) come from
 *  admin → تنظیمات → ارسال و تحویل; the pickup note shows the store address
 *  from تنظیمات → فروشگاه (§4.14, §8). */
export default function AddressClient({
  delivery,
  store,
  referralEnabled = false,
}: {
  delivery: SiteSettings["delivery"];
  store: SiteSettings["store"];
  /** admin → بازاریابی → معرفی دوستان */
  referralEnabled?: boolean;
}) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const deliveryDays = useMemo(
    () => nextDeliveryDays(delivery.daysAhead, delivery.closedWeekdays),
    [delivery.daysAhead, delivery.closedWeekdays],
  );
  const deliveryHours = delivery.hours;
  const iranStates = delivery.provinces;
  // returning shopper: start from what they entered last time. The form only
  // renders after the phone gate (client-side), so reading storage here never
  // affects server markup.
  const [method, setMethod] = useState<DeliveryMethod>(() => {
    const saved = getCheckout()?.method ?? "shipping";
    return saved === "no-shipping" && !delivery.pickupEnabled ? "shipping" : saved;
  });
  const [form, setForm] = useState<Form>(() => {
    const saved = getCheckout();
    return {
      name: saved?.name ?? "",
      melicode: saved?.melicode ?? "",
      referral: saved?.referral ?? "",
      mobile: saved?.mobile || saved?.phone || "",
      state: saved?.state || delivery.defaultProvince,
      city: saved?.city ?? "",
      landline: saved?.landline ?? "",
      postcode: saved?.postcode ?? "",
      address: saved?.address ?? "",
      pickupDay: saved?.pickupDay || deliveryDays[0] || "",
      pickupHour: saved?.pickupHour || deliveryHours[0] || "",
    };
  });

  const set = (k: keyof Form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  /* ---- inline validation ---- */
  const errors: Partial<Record<keyof Form, string>> = {};
  if (form.name.trim().length < 3) errors.name = "نام و نام خانوادگی را کامل وارد کنید.";
  if (!normalizeMobile(form.mobile)) errors.mobile = "شماره موبایل ۱۱ رقمی و با ۰۹ شروع می‌شود.";
  if (form.melicode.trim() && !isMelicode(form.melicode)) errors.melicode = "کد ملی باید ۱۰ رقم باشد.";
  if (method === "shipping") {
    if (!form.city.trim()) errors.city = "نام شهر را وارد کنید.";
    if (!isPostcode(form.postcode)) errors.postcode = "کد پستی ۱۰ رقمی است.";
    if (form.address.trim().length < 10) errors.address = "آدرس دقیق (خیابان، کوچه، پلاک، واحد) را بنویسید.";
  }
  const showError = (k: keyof Form) => (submitted ? errors[k] : undefined);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const first = (Object.keys(errors) as (keyof Form)[])[0];
    if (first) {
      const el = document.getElementById(`f-${first}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    saveCheckout({
      name: form.name.trim(),
      melicode: form.melicode.trim(),
      referral: form.referral.trim(),
      mobile: normalizeMobile(form.mobile),
      state: form.state,
      city: form.city.trim(),
      landline: form.landline.trim(),
      postcode: form.postcode.trim(),
      address: form.address.trim(),
      method,
      pickupDay: form.pickupDay,
      pickupHour: form.pickupHour,
    });
    router.push("/checkout");
  };

  if (!verified)
    return (
      <PhoneGate
        onVerified={(phone) => {
          saveCheckout({ phone });
          setForm((f) => ({ ...f, mobile: f.mobile || phone }));
          setVerified(true);
        }}
      />
    );

  const inputProps = (id: keyof Form) => ({
    id: `f-${id}`,
    value: form[id],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(id, e.target.value),
    "aria-invalid": !!showError(id),
    "aria-describedby": showError(id) ? `e-${id}` : undefined,
  });

  return (
    <main className="page-bg pb-6 lg:pb-16">
      <section id="title-cart">
        <div className="flex h-14 items-center bg-white px-4 font-bold shadow-sm lg:h-16 lg:px-8 lg:text-lg">
          تعیین آدرس
        </div>
      </section>
      <CheckoutSteps current={2} />

      <form onSubmit={onSubmit} noValidate>
        <section
          id="main-address"
          className="space-y-4 px-4 pt-2 lg:mx-auto lg:max-w-xl lg:px-8 lg:pt-4"
        >
          {/* identity */}
          <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
            <p className="mb-3 text-sm font-bold">مشخصات گیرنده</p>
            <div className="space-y-3">
              <Field id="name" label="نام و نام خانوادگی" required error={showError("name")}>
                <input className={fieldCls} autoComplete="name" {...inputProps("name")} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="mobile" label="شماره موبایل" required error={showError("mobile")}>
                  <input
                    className={fieldCls}
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    autoComplete="tel"
                    {...inputProps("mobile")}
                  />
                </Field>
                <Field id="melicode" label="کد ملی" error={showError("melicode")}>
                  <input
                    className={fieldCls}
                    inputMode="numeric"
                    dir="ltr"
                    {...inputProps("melicode")}
                  />
                </Field>
              </div>
              {referralEnabled && (
                <Field id="referral" label="کد معرف (اختیاری)">
                  <input className={fieldCls} dir="ltr" placeholder="MD-…" {...inputProps("referral")} />
                </Field>
              )}
            </div>
          </div>

          {/* delivery method */}
          <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
            <p className="mb-3 text-sm font-bold">نحوه تحویل</p>
            <div role="group" aria-label="نحوه تحویل" className="grid grid-cols-2 gap-2 rounded-xl bg-modi-gray-300 p-1 text-sm">
              {(
                [
                  ["shipping", "ارسال به آدرس"],
                  ...(delivery.pickupEnabled ? [["no-shipping", "دریافت حضوری"]] : []),
                ] as [DeliveryMethod, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={method === m}
                  onClick={() => setMethod(m)}
                  className={`h-10 rounded-lg transition ${
                    method === m
                      ? "bg-white font-bold text-modi-purple-800 shadow-sm"
                      : "text-modi-gray-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-modi-gray-900">
              {method === "shipping"
                ? "ارسال به سراسر ایران رایگان است."
                : "سفارش در روز و ساعت انتخابی آماده تحویل خواهد بود."}
            </p>
          </div>

          {method === "shipping" ? (
            <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
              <p className="mb-3 text-sm font-bold">آدرس ارسال</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field id="state" label="استان" required error={showError("state")}>
                    <select className={fieldCls} {...inputProps("state")}>
                      {iranStates.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="city" label="شهر" required error={showError("city")}>
                    <input className={fieldCls} autoComplete="address-level2" {...inputProps("city")} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="postcode" label="کد پستی" required error={showError("postcode")}>
                    <input
                      className={fieldCls}
                      inputMode="numeric"
                      dir="ltr"
                      autoComplete="postal-code"
                      {...inputProps("postcode")}
                    />
                  </Field>
                  <Field id="landline" label="شماره ثابت" error={showError("landline")}>
                    <input
                      className={fieldCls}
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      {...inputProps("landline")}
                    />
                  </Field>
                </div>
                <Field id="address" label="آدرس دقیق" required error={showError("address")}>
                  <textarea
                    className="min-h-24 w-full rounded-lg border-0 bg-modi-gray-300 p-3 text-sm leading-6 outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500"
                    placeholder="خیابان، کوچه، پلاک، واحد"
                    autoComplete="street-address"
                    {...inputProps("address")}
                  />
                </Field>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
              <p className="mb-3 text-sm font-bold">زمان مراجعه</p>
              <div className="grid grid-cols-2 gap-3">
                <Field id="pickupDay" label="روز" required error={showError("pickupDay")}>
                  <select className={fieldCls} {...inputProps("pickupDay")}>
                    {deliveryDays.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="pickupHour" label="ساعت" required error={showError("pickupHour")}>
                  <select className={fieldCls} {...inputProps("pickupHour")}>
                    {deliveryHours.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="mt-4 rounded-xl bg-modi-purple-200 px-3 py-2 text-[11px] leading-6 text-modi-purple-800">
                نشانی فروشگاه: {store.address}
                {store.workingHours ? ` · ${store.workingHours}` : ""}
                {delivery.codEnabled ? " · امکان پرداخت در محل" : ""}
                <br />
                برای هماهنگی سریع‌تر:{" "}
                <a href={store.telegramUrl} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">
                  پشتیبانی تلگرام
                </a>
              </p>
            </div>
          )}
        </section>

        <section
          id="footer-cart"
          className="fixed bottom-0 left-0 w-full lg:static lg:mx-auto lg:mt-6 lg:max-w-xl lg:px-8"
        >
          <div className="flex items-center gap-3 border-t border-modi-gray-500 bg-white p-4 lg:rounded-2xl lg:border-0 lg:shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
            <Link
              href="/cart"
              className="flex h-11 basis-1/3 items-center justify-center rounded-xl bg-modi-purple-200 text-sm text-modi-purple-800"
            >
              بازگشت
            </Link>
            <button
              type="submit"
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-modi-purple-800 text-sm font-bold text-white"
            >
              ادامه به پرداخت
            </button>
          </div>
          {submitted && Object.keys(errors).length > 0 && (
            <p role="alert" className="bg-[#fff6f6] px-4 py-2 text-center text-[11px] text-[#d9463e]">
              {Object.keys(errors).length.toLocaleString("fa-IR")} مورد نیاز به اصلاح دارد.
            </p>
          )}
        </section>
      </form>
    </main>
  );
}
