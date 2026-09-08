"use client";

import { useState, useTransition } from "react";
import { submitContactAction } from "@/lib/orderActions";

/** Contact-page form — submissions land in admin → دیدگاه‌ها و پیام‌ها → پیام‌های تماس (§4.8/§4.10). */
export default function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cls = "h-10 w-full rounded-lg border-0 bg-modi-gray-300 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500";

  if (done)
    return <p className="mt-6 rounded-2xl bg-[#eaf7dc] px-4 py-3 text-sm text-[#5c9a00] lg:max-w-xl">پیام شما دریافت شد؛ در ساعات کاری پاسخ می‌دهیم.</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (name.trim().length < 2) return setError("نام را وارد کنید.");
        if (!/^0?9\d{9}$/.test(phone.replace(/\D/g, ""))) return setError("شماره موبایل معتبر نیست.");
        if (text.trim().length < 5) return setError("متن پیام کوتاه است.");
        start(async () => {
          try {
            await submitContactAction({ name, phone, text });
            setDone(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "ارسال نشد");
          }
        });
      }}
      className="mt-6 space-y-3 rounded-2xl bg-modi-gray-300 p-4 lg:max-w-xl"
    >
      <p className="text-sm font-bold">ارسال پیام</p>
      <div className="grid grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام" className={`${cls} bg-white`} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="موبایل" dir="ltr" className={`${cls} bg-white text-left`} />
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام شما…" className="min-h-24 w-full rounded-lg bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-modi-purple-500" />
      {error && <p className="text-[11px] text-[#C40000]">{error}</p>}
      <button type="submit" disabled={pending} className="h-10 rounded-xl bg-modi-purple-800 px-6 text-sm font-bold text-white disabled:opacity-60">
        {pending ? "در حال ارسال…" : "ارسال"}
      </button>
    </form>
  );
}
