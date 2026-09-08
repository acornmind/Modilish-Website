"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SiteSettings } from "@/lib/siteContent";
import { saveSettingsAction } from "@/lib/siteActions";
import { toast } from "@/lib/toast";
import { btnPrimary, btnSoft, Card, inputCls, PageHeader, SaveBar } from "./ui";

type I = SiteSettings["integrations"];

const fields: { key: keyof I; service: string; label: string; placeholder: string; use: string; hint: string; test?: (v: string) => string }[] = [
  { key: "zarinpalMerchantId", service: "زرین‌پال", label: "Merchant ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", use: "پرداخت", hint: "پنل زرین‌پال → درگاه‌ها → مرچنت", test: (v) => (v.length === 36 ? "فرمت درست است" : "باید ۳۶ کاراکتر باشد") },
  { key: "zarinpalToken", service: "زرین‌پال", label: "Access token (اختیاری)", placeholder: "eyJ…", use: "بازپرداخت از طریق درگاه", hint: "پنل زرین‌پال → تنظیمات → توکن" },
  { key: "kavenegarKey", service: "کاوه‌نگار", label: "API key", placeholder: "۶۴+ کاراکتر هگز", use: "کد ورود، پیامک سفارش، کمپین", hint: "panel.kavenegar.com → حساب کاربری", test: (v) => (v.length >= 32 ? "فرمت درست است" : "کوتاه به نظر می‌رسد") },
  { key: "kavenegarSender", service: "کاوه‌نگار", label: "شماره فرستنده", placeholder: "1000… / 2000…", use: "خط تبلیغاتی", hint: "شماره‌های خط در پنل کاوه‌نگار" },
  { key: "s3Endpoint", service: "فضای ذخیره‌سازی", label: "Endpoint", placeholder: "https://s3.ir-thr-at1.arvanstorage.ir", use: "تصاویر و ویدیو", hint: "آروان / لیارا / هم‌روش" },
  { key: "s3Bucket", service: "فضای ذخیره‌سازی", label: "Bucket", placeholder: "modilish-media", use: "تصاویر و ویدیو", hint: "" },
  { key: "telegramBotToken", service: "تلگرام (اختیاری)", label: "Bot token", placeholder: "123456789:AA…", use: "هشدار سفارش جدید / موجودی کم", hint: "@BotFather" },
  { key: "telegramChatId", service: "تلگرام (اختیاری)", label: "Chat ID", placeholder: "-100…", use: "مقصد هشدارها", hint: "" },
  { key: "googleVerification", service: "Google Search Console", label: "Verification tag", placeholder: "…", use: "سئو", hint: "متای google-site-verification" },
  { key: "analyticsId", service: "آنالیتیکس (اختیاری)", label: "GA4 id", placeholder: "G-…", use: "ترافیک", hint: "" },
];

const mask = (v: string) => (v ? "●●●●" + v.slice(-4) : "");

/** تنظیمات → اتصال‌ها — docs/admin-spec.md §4.14 (write-only display once saved, «تست» where possible). */
export default function IntegrationsForm({ initial }: { initial: I }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState<Set<keyof I>>(new Set());
  const [tests, setTests] = useState<Partial<Record<keyof I, string>>>({});
  const [saving, start] = useTransition();
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);

  function save() {
    start(async () => {
      try {
        await saveSettingsAction("integrations", value);
        setSaved(value);
        setEditing(new Set());
        toast("ذخیره شد");
        router.refresh();
      } catch {
        toast("ذخیره نشد");
      }
    });
  }

  const groups = [...new Set(fields.map((f) => f.service))];

  return (
    <div>
      <PageHeader
        title="اتصال‌ها"
        subtitle="همه کلیدهای خارجی در یک جا — فقط مالک این صفحه را می‌بیند"
        back={{ href: "/admin/settings", label: "تنظیمات" }}
        actions={<button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary}>{saving ? "…" : "ذخیره"}</button>}
      />
      <p className="mb-4 rounded-xl bg-modi-info-bg px-3 py-2 text-xs leading-6 text-modi-info">
        وضعیت اتصال درگاه و پیامک روی پیشخوان از همین کلیدها خوانده می‌شود: تا کلید زرین‌پال و کاوه‌نگار وارد نشود، نوار «درگاه پرداخت / پیامک متصل نیست» نمایش داده می‌شود.
        کلیدها در <span dir="ltr">data/site.json</span> ذخیره می‌شوند؛ پیش از استقرار، این فایل باید خارج از مخزن و رمزگذاری‌شده نگه داشته شود (بخش ۹ مستند).
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g} title={g}>
            <div className="space-y-3">
              {fields.filter((f) => f.service === g).map((f) => {
                const isEditing = editing.has(f.key) || !saved[f.key];
                return (
                  <div key={f.key}>
                    <span className="mb-1 block text-xs font-bold">{f.label}</span>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <input value={value[f.key]} onChange={(e) => setValue({ ...value, [f.key]: e.target.value.trim() })} placeholder={f.placeholder} dir="ltr" className={`${inputCls} text-left font-mono text-xs`} />
                      ) : (
                        <input value={mask(saved[f.key])} readOnly dir="ltr" className={`${inputCls} text-left font-mono text-xs opacity-70`} />
                      )}
                      {!isEditing && (
                        <button type="button" onClick={() => setEditing(new Set([...editing, f.key]))} className={`${btnSoft} h-10 shrink-0 text-xs`}>تغییر</button>
                      )}
                      {f.test && (
                        <button type="button" onClick={() => setTests({ ...tests, [f.key]: value[f.key] ? f.test!(value[f.key]) : "خالی است" })} className={`${btnSoft} h-10 shrink-0 text-xs`}>تست</button>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-modi-gray-900">
                      {f.use}
                      {f.hint && <> · کجا پیدایش کنم؟ {f.hint}</>}
                      {tests[f.key] && <span className="ms-2 font-bold text-modi-purple-800">{tests[f.key]}</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onCancel={() => { setValue(saved); setEditing(new Set()); }} />
    </div>
  );
}
