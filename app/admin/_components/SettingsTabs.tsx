"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { defaultStrings, stringLabels, type SiteSettings } from "@/lib/siteContent";
import { iranStates } from "@/lib/iran";
import { saveSettingsAction } from "@/lib/siteActions";
import { toast } from "@/lib/toast";
import { faNum } from "@/lib/adminFormat";
import { btnPrimary, btnSoft, Card, Field, inputCls, SaveBar, StringList, Tabs, textareaCls, Toggle } from "./ui";

type TabKey = "store" | "delivery" | "payment" | "catalogue" | "seo" | "strings" | "backup" | "links";

/** One saveable settings section: local draft + dirty flag + save (§4.14). */
function useSection<K extends keyof SiteSettings>(key: K, initial: SiteSettings[K]) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, start] = useTransition();
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const save = () =>
    start(async () => {
      try {
        await saveSettingsAction(key, value);
        setSaved(value);
        toast("ذخیره شد");
        router.refresh();
      } catch {
        toast("ذخیره نشد");
      }
    });
  const cancel = () => setValue(saved);
  return { value, setValue, save, cancel, dirty, saving };
}

const weekdays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

export default function SettingsTabs({ settings, initialTab }: { settings: SiteSettings; initialTab?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(initialTab ?? "store");
  const tabs: { key: TabKey; label: string }[] = [
    { key: "store", label: "فروشگاه" },
    { key: "delivery", label: "ارسال و تحویل" },
    { key: "payment", label: "پرداخت — زرین‌پال" },
    { key: "catalogue", label: "کاتالوگ و نمایش" },
    { key: "seo", label: "سئو" },
    { key: "strings", label: "متن‌ها" },
    { key: "backup", label: "پشتیبان‌گیری" },
    { key: "links", label: "بخش‌های دیگر" },
  ];
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-base font-bold lg:text-lg">تنظیمات</h1>
        <p className="mt-0.5 text-xs text-modi-gray-900">هر تب جداگانه ذخیره می‌شود و بلافاصله روی سایت اعمال می‌شود.</p>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "store" && <StoreTab initial={settings.store} />}
      {tab === "delivery" && <DeliveryTab initial={settings.delivery} />}
      {tab === "payment" && <PaymentTab initial={settings.payment} />}
      {tab === "catalogue" && <CatalogueTab initial={settings.catalogue} />}
      {tab === "seo" && <SeoTab initial={settings.seo} />}
      {tab === "strings" && <StringsTab initial={settings.strings} />}
      {tab === "backup" && <BackupTab />}
      {tab === "links" && <LinksTab />}
    </div>
  );
}

/** «متن‌ها» — the storefront's fixed labels, editable without a deploy (§4.14). */
function StringsTab({ initial }: { initial: Record<string, string> }) {
  const s = useSection("strings", { ...defaultStrings, ...initial });
  const v = s.value;
  const [q, setQ] = useState("");
  const keys = Object.keys(defaultStrings).filter((k) => !q || stringLabels[k]?.includes(q) || v[k]?.includes(q) || defaultStrings[k].includes(q));
  const changed = Object.keys(defaultStrings).filter((k) => v[k] !== defaultStrings[k]).length;
  return (
    <div className="space-y-4">
      <Card
        title={`متن‌های ثابت سایت · ${faNum(changed)} تغییر نسبت به پیش‌فرض`}
        action={
          <span className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…" className={`${inputCls} h-9 max-w-[180px]`} />
            <button type="button" disabled={changed === 0} onClick={() => s.setValue({ ...defaultStrings })} className={`${btnSoft} h-9 text-xs`}>بازنشانی همه</button>
          </span>
        }
      >
        <p className="mb-3 text-[11px] leading-5 text-modi-gray-900">دکمه‌ها، عنوان ریل‌ها، پیام‌های خطا و متن‌های سبد خرید. <span dir="ltr" className="font-mono">%s</span> جای مقدار متغیر می‌نشیند.</p>
        <div className="divide-y divide-[#f3f0f7]">
          {keys.map((k) => (
            <div key={k} className="grid grid-cols-1 items-center gap-2 py-2 lg:grid-cols-[1fr_1.2fr_auto]">
              <label htmlFor={`str-${k}`} className="text-xs">
                <span className="block font-bold">{stringLabels[k] ?? k}</span>
                {v[k] !== defaultStrings[k] && <span className="block text-[11px] text-modi-gray-900">پیش‌فرض: {defaultStrings[k]}</span>}
              </label>
              <input id={`str-${k}`} value={v[k] ?? ""} onChange={(e) => s.setValue({ ...v, [k]: e.target.value })} className={`${inputCls} h-9`} />
              <button type="button" disabled={v[k] === defaultStrings[k]} onClick={() => s.setValue({ ...v, [k]: defaultStrings[k] })} className="h-9 rounded-lg px-2 text-[11px] text-modi-gray-900 hover:bg-modi-gray-300 disabled:opacity-40">بازنشانی</button>
            </div>
          ))}
          {keys.length === 0 && <p className="py-6 text-center text-xs text-modi-gray-900">متنی پیدا نشد.</p>}
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.save} onCancel={s.cancel} />
    </div>
  );
}

/** Download everything the admin can change; CSVs for spreadsheets (§4.14). */
function BackupTab() {
  const files = [
    { href: "/api/admin/export?type=all", title: "پشتیبان کامل (JSON)", text: "تنظیمات، صفحات، مجله، محصولات، سفارش‌ها، دیدگاه‌ها، پیام‌ها، گزارش پیامک و فعالیت — همه در یک فایل" },
    { href: "/api/admin/export?type=products", title: "محصولات (CSV)", text: "همان ستون‌های درون‌ریزی؛ در اکسل ویرایش و دوباره درون‌ریزی کنید" },
    { href: "/api/admin/export?type=orders", title: "سفارش‌ها (CSV)", text: "همه سفارش‌ها با وضعیت، مبالغ، تحویل و کد رهگیری" },
    { href: "/api/admin/export?type=customers", title: "مشتریان (CSV)", text: "نام، موبایل، تعداد و مبلغ سفارش‌ها" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {files.map((f) => (
        <a key={f.href} href={f.href} download className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] hover:-translate-y-0.5">
          <p className="text-sm font-bold text-modi-purple-800">⤓ {f.title}</p>
          <p className="mt-1 text-xs leading-5 text-modi-gray-900">{f.text}</p>
        </a>
      ))}
      <p className="text-[11px] leading-5 text-modi-gray-900 lg:col-span-2">
        روی سرور، پوشه <span dir="ltr" className="font-mono">data/</span> و <span dir="ltr" className="font-mono">public/img/uploads/</span> همه محتوای مدیریت را نگه می‌دارند؛ پشتیبان روزانه خودکار همان کپی این دو پوشه است. بازگردانی: فایل‌های JSON را جایگزین کنید و سرور را دوباره راه بیندازید.
      </p>
    </div>
  );
}

function StoreTab({ initial }: { initial: SiteSettings["store"] }) {
  const s = useSection("store", initial);
  const v = s.value;
  const set = (patch: Partial<typeof v>) => s.setValue({ ...v, ...patch });
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <Card title="هویت فروشگاه">
        <div className="space-y-3">
          <Field label="نام"><input value={v.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} /></Field>
          <Field label="نام حقوقی" hint="روی فاکتور و صفحه درباره ما"><input value={v.legalName} onChange={(e) => set({ legalName: e.target.value })} className={inputCls} /></Field>
          <Field label="متن کپی‌رایت فوتر"><input value={v.copyright} onChange={(e) => set({ copyright: e.target.value })} className={inputCls} /></Field>
        </div>
      </Card>
      <Card title="راه‌های تماس">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="تلفن"><input value={v.phone} onChange={(e) => set({ phone: e.target.value })} className={`${inputCls} tabular-nums`} /></Field>
            <Field label="ایمیل"><input value={v.email} onChange={(e) => set({ email: e.target.value })} dir="ltr" className={`${inputCls} text-left`} /></Field>
            <Field label="تلگرام (نمایش)"><input value={v.telegram} onChange={(e) => set({ telegram: e.target.value })} dir="ltr" className={`${inputCls} text-left`} /></Field>
            <Field label="لینک تلگرام"><input value={v.telegramUrl} onChange={(e) => set({ telegramUrl: e.target.value })} dir="ltr" className={`${inputCls} text-left`} /></Field>
            <Field label="اینستاگرام (بدون @)"><input value={v.instagram} onChange={(e) => set({ instagram: e.target.value })} dir="ltr" className={`${inputCls} text-left`} /></Field>
            <Field label="ساعات کاری"><input value={v.workingHours} onChange={(e) => set({ workingHours: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="آدرس فروشگاه" hint="برای تحویل حضوری و صفحه تماس با ما">
            <textarea value={v.address} onChange={(e) => set({ address: e.target.value })} className={`${textareaCls} min-h-16`} />
          </Field>
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.save} onCancel={s.cancel} />
    </div>
  );
}

function DeliveryTab({ initial }: { initial: SiteSettings["delivery"] }) {
  const s = useSection("delivery", initial);
  const v = s.value;
  const set = (patch: Partial<typeof v>) => s.setValue({ ...v, ...patch });
  const toggleProvince = (p: string) =>
    set({ provinces: v.provinces.includes(p) ? v.provinces.filter((x) => x !== p) : [...v.provinces, p] });
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <Card title="روش‌های ارسال">
        <p className="mb-2 text-[11px] leading-5 text-modi-gray-900">
          طبق تصمیم شماره ۲ مستند، ارسال فعلاً همه‌جا رایگان است (قیمت پایه ۰). موتور قوانین هزینه ارسال در فاز بعد به این‌جا اضافه می‌شود.
        </p>
        <div className="space-y-2">
          {v.methods.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_1fr_auto_auto] items-center gap-1.5">
              <input value={m.name} onChange={(e) => set({ methods: v.methods.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="نام" className={`${inputCls} h-9`} />
              <input value={m.priceToman} onChange={(e) => set({ methods: v.methods.map((x, j) => (j === i ? { ...x, priceToman: Number(e.target.value) || 0 } : x)) })} inputMode="numeric" className={`${inputCls} h-9 tabular-nums`} />
              <input value={m.eta} onChange={(e) => set({ methods: v.methods.map((x, j) => (j === i ? { ...x, eta: e.target.value } : x)) })} placeholder="زمان تحویل" className={`${inputCls} h-9`} />
              <button type="button" onClick={() => set({ methods: v.methods.map((x, j) => (j === i ? { ...x, active: !x.active } : x)) })} className={`h-9 rounded-lg px-2 text-[11px] font-bold ${m.active ? "bg-modi-success-bg text-modi-success" : "bg-modi-gray-500 text-modi-gray-900"}`}>
                {m.active ? "فعال" : "غیرفعال"}
              </button>
              <button type="button" onClick={() => set({ methods: v.methods.filter((_, j) => j !== i) })} className="h-9 w-8 rounded-lg bg-modi-danger-bg text-modi-danger">×</button>
            </div>
          ))}
          <button type="button" onClick={() => set({ methods: [...v.methods, { name: "", priceToman: 0, eta: "", active: false }] })} className={`${btnSoft} h-9 text-xs`}>
            + روش جدید
          </button>
        </div>
      </Card>
      <Card title="تحویل حضوری">
        <Toggle checked={v.pickupEnabled} onChange={(x) => set({ pickupEnabled: x })} label="تحویل حضوری" hint="گزینه «دریافت حضوری» در مرحله آدرس" />
        <Toggle checked={v.codEnabled} onChange={(x) => set({ codEnabled: x })} label="پرداخت در محل" hint="فقط برای تحویل حضوری" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="چند روز جلوتر"><input type="number" min={1} max={30} value={v.daysAhead} onChange={(e) => set({ daysAhead: Number(e.target.value) || 7 })} className={inputCls} /></Field>
          <Field label="روزهای تعطیل">
            <div className="flex flex-wrap gap-1">
              {weekdays.map((d, i) => (
                <button key={d} type="button" onClick={() => set({ closedWeekdays: v.closedWeekdays.includes(i) ? v.closedWeekdays.filter((x) => x !== i) : [...v.closedWeekdays, i] })} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${v.closedWeekdays.includes(i) ? "bg-modi-danger-bg text-modi-danger" : "bg-modi-gray-300"}`}>
                  {d}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Field label="بازه‌های ساعتی" className="mt-3">
          <StringList items={v.hours} onChange={(hours) => set({ hours })} placeholder="مثلاً ۹ تا ۱۲" />
        </Field>
      </Card>
      <Card title="استان‌های تحت پوشش" className="lg:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <Field label="استان پیش‌فرض فرم آدرس" className="max-w-xs flex-1">
            <select value={v.defaultProvince} onChange={(e) => set({ defaultProvince: e.target.value })} className={inputCls}>
              {iranStates.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <button type="button" onClick={() => set({ provinces: [...iranStates] })} className={`${btnSoft} mt-5 h-9 text-xs`}>همه</button>
          <span className="mt-5 text-xs text-modi-gray-900">{faNum(v.provinces.length)} از {faNum(iranStates.length)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {iranStates.map((p) => (
            <button key={p} type="button" onClick={() => toggleProvince(p)} className={`rounded-full px-3 py-1 text-xs ${v.provinces.includes(p) ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300 text-modi-gray-900"}`}>
              {p}
            </button>
          ))}
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.save} onCancel={s.cancel} />
    </div>
  );
}

function PaymentTab({ initial }: { initial: SiteSettings["payment"] }) {
  const s = useSection("payment", initial);
  const v = s.value;
  const set = (patch: Partial<typeof v>) => s.setValue({ ...v, ...patch });
  const callback = typeof window !== "undefined" ? `${window.location.origin}/api/payment/callback/zarinpal` : "/api/payment/callback/zarinpal";
  const [tested, setTested] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <Card title="زرین‌پال">
        <div className="space-y-3">
          <Field label="Merchant ID" hint="۳۶ کاراکتر از پنل زرین‌پال — همین مقدار در «اتصال‌ها» هم دیده می‌شود">
            <input value={v.merchantId} onChange={(e) => set({ merchantId: e.target.value.trim() })} dir="ltr" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={`${inputCls} text-left font-mono text-xs`} />
          </Field>
          <Field label="آدرس بازگشت (در پنل زرین‌پال ثبت کنید)">
            <div className="flex gap-2">
              <input value={callback} readOnly dir="ltr" className={`${inputCls} text-left text-xs opacity-80`} />
              <button type="button" onClick={() => { navigator.clipboard?.writeText(callback); toast("کپی شد"); }} className={`${btnSoft} h-10 shrink-0 text-xs`}>کپی</button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="واحد پول">
              <select value={v.currency} onChange={(e) => set({ currency: e.target.value as "IRT" | "IRR" })} className={inputCls}>
                <option value="IRT">تومان (IRT)</option>
                <option value="IRR">ریال (IRR)</option>
              </select>
            </Field>
            <Field label="توضیح پرداخت روی درگاه"><input value={v.description} onChange={(e) => set({ description: e.target.value })} className={inputCls} /></Field>
          </div>
          <Toggle checked={v.sandbox} onChange={(x) => set({ sandbox: x })} label="حالت آزمایشی (sandbox)" />
          <Toggle checked={v.zarinGate} onChange={(x) => set({ zarinGate: x })} label="زرین‌گیت" hint="اتصال مستقیم به صفحه بانک — نیاز به تایید جداگانه" />
          <button
            type="button"
            className={`${btnSoft} h-9 text-xs`}
            onClick={() => setTested(v.merchantId.length === 36 ? "فرمت Merchant ID درست است. اتصال واقعی پس از پیاده‌سازی فراخوانی درگاه (فاز ۱، بخش ۷) آزمایش می‌شود." : "Merchant ID باید ۳۶ کاراکتر باشد.")}
          >
            تست اتصال
          </button>
          {tested && <p className="text-[11px] leading-5 text-modi-gray-900">{tested}</p>}
        </div>
      </Card>
      <Card title="روش‌های دیگر">
        <Toggle checked={v.walletEnabled} onChange={(x) => set({ walletEnabled: x })} label="پرداخت با کیف پول" />
        <Toggle checked={v.cardToCard} onChange={(x) => set({ cardToCard: x })} label="کارت‌به‌کارت / نقدی برای سفارش دستی" />
        <Field label="انقضای سفارش پرداخت‌نشده (ساعت)" hint="پس از آن، رزرو موجودی آزاد می‌شود" className="mt-3">
          <input type="number" min={1} value={v.orderExpiryHours} onChange={(e) => set({ orderExpiryHours: Number(e.target.value) || 24 })} className={`${inputCls} w-28`} />
        </Field>
        <Field label="مالیات بر ارزش افزوده (٪)" hint="قیمت‌های سایت شامل مالیات‌اند؛ این درصد فقط روی فاکتور چاپی تفکیک می‌شود. ۰ = نمایش داده نشود" className="mt-3">
          <input type="number" min={0} max={30} value={v.vatPercent ?? 0} onChange={(e) => set({ vatPercent: Number(e.target.value) || 0 })} className={`${inputCls} w-28 tabular-nums`} />
        </Field>
      </Card>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.save} onCancel={s.cancel} />
    </div>
  );
}

function CatalogueTab({ initial }: { initial: SiteSettings["catalogue"] }) {
  const s = useSection("catalogue", initial);
  const v = s.value;
  const set = (patch: Partial<typeof v>) => s.setValue({ ...v, ...patch });
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <Card title="فهرست‌ها">
        <div className="grid grid-cols-2 gap-3">
          <Field label="محصول در هر صفحه"><input type="number" min={4} max={60} value={v.pageSize} onChange={(e) => set({ pageSize: Number(e.target.value) || 16 })} className={inputCls} /></Field>
          <Field label="ترتیب پیش‌فرض">
            <select value={v.defaultSort} onChange={(e) => set({ defaultSort: e.target.value as typeof v.defaultSort })} className={inputCls}>
              <option value="date">جدیدترین</option>
              <option value="popularity">محبوب‌ترین</option>
              <option value="price">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
            </select>
          </Field>
          <Field label="چیپ فیلتر در هر بُعد"><input type="number" min={3} max={40} value={v.chipPreview} onChange={(e) => set({ chipPreview: Number(e.target.value) || 12 })} className={inputCls} /></Field>
          <Field label="ناموجودها">
            <select value={v.outOfStock} onChange={(e) => set({ outOfStock: e.target.value as "show" | "hide" })} className={inputCls}>
              <option value="show">نمایش با برچسب «ناموجود»</option>
              <option value="hide">پنهان از فهرست‌ها</option>
            </select>
          </Field>
        </div>
      </Card>
      <Card title="صفحه محصول">
        <div className="grid grid-cols-2 gap-3">
          <Field label="طول ریل رنگ‌بندی"><input type="number" min={2} max={20} value={v.colorwayLimit} onChange={(e) => set({ colorwayLimit: Number(e.target.value) || 8 })} className={inputCls} /></Field>
          <Field label="تعداد محصولات مرتبط"><input type="number" min={2} max={20} value={v.relatedLimit} onChange={(e) => set({ relatedLimit: Number(e.target.value) || 10 })} className={inputCls} /></Field>
        </div>
        <div className="mt-2">
          <Toggle checked={v.showStock} onChange={(x) => set({ showStock: x })} label="نمایش موجودی به مشتری" hint="«موجود · ۱۰ متر» یا فقط «موجود»" />
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.save} onCancel={s.cancel} />
    </div>
  );
}

function SeoTab({ initial }: { initial: SiteSettings["seo"] }) {
  const s = useSection("seo", initial);
  const v = s.value;
  const set = (patch: Partial<typeof v>) => s.setValue({ ...v, ...patch });
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <Card title="پیش‌فرض‌ها">
        <div className="space-y-3">
          <Field label="قالب عنوان صفحات" hint="%s جای عنوان صفحه می‌نشیند"><input value={v.titleTemplate} onChange={(e) => set({ titleTemplate: e.target.value })} className={inputCls} /></Field>
          <Field label="توضیح متا پیش‌فرض"><textarea value={v.defaultDescription} onChange={(e) => set({ defaultDescription: e.target.value })} className={`${textareaCls} min-h-16`} /></Field>
          <Toggle checked={v.robotsIndex} onChange={(x) => set({ robotsIndex: x })} label="ایندکس توسط موتورهای جستجو" hint="برای نسخه آزمایشی خاموش کنید" />
        </div>
      </Card>
      <Card title="عناوین صفحات سیستمی">
        <div className="space-y-3">
          <Field label="صفحه اصلی"><input value={v.homeTitle} onChange={(e) => set({ homeTitle: e.target.value })} className={inputCls} /></Field>
          <Field label="فروشگاه"><input value={v.shopTitle} onChange={(e) => set({ shopTitle: e.target.value })} className={inputCls} /></Field>
          <Field label="صفحه جنس (قالب)" hint="%s = نام جنس"><input value={v.materialTitleTemplate} onChange={(e) => set({ materialTitleTemplate: e.target.value })} className={inputCls} /></Field>
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.save} onCancel={s.cancel} />
    </div>
  );
}

function LinksTab() {
  const links = [
    { href: "/admin/settings/users", title: "کاربران و دسترسی‌ها", text: "کاربران، نقش‌ها و جدول دسترسی، کلیدهای API" },
    { href: "/admin/settings/integrations", title: "اتصال‌ها", text: "کلیدهای زرین‌پال، کاوه‌نگار، فضای ذخیره‌سازی، تلگرام" },
    { href: "/admin/sms", title: "پیامک", text: "پیامک‌های خودکار، ارسال انبوه و تکی، گزارش، تنظیمات" },
    { href: "/admin/reviews", title: "دیدگاه‌ها و پیام‌ها", text: "تایید خودکار، پیامک درخواست نظر" },
    { href: "/admin/settings/audit", title: "گزارش فعالیت", text: "هر تغییری که در مدیریت انجام شده" },
    { href: "/admin/notifications", title: "اعلان‌ها", text: "کدام رویداد از کدام کانال (داخل مدیریت، پیامک، پوش) اطلاع داده شود" },
    { href: "/admin/marketing?tab=shipping", title: "قوانین ارسال", text: "ارسال رایگان از مبلغ / متراژ / برای گروه — در بازاریابی" },
    { href: "/admin/products/import", title: "درون‌ریزی محصولات", text: "CSV از اکسل → تطبیق ستون → پیش‌نمایش → ثبت" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] hover:-translate-y-0.5">
          <p className="text-sm font-bold text-modi-purple-800">{l.title}</p>
          <p className="mt-1 text-xs text-modi-gray-900">{l.text}</p>
        </Link>
      ))}
      <span className="hidden">{btnPrimary}</span>
    </div>
  );
}
