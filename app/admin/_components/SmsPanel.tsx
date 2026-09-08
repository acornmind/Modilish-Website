"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SiteSettings, SmsTemplate } from "@/lib/siteContent";
import type { SmsEntry } from "@/lib/orderStore";
import { saveSettingsAction } from "@/lib/siteActions";
import { sendSmsAction } from "@/lib/orderActions";
import { formatJalali } from "@/lib/orders";
import { faNum, tomanShort } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import { BackendNote, btnPrimary, btnSoft, Card, EmptyState, Field, inputCls, SaveBar, Tabs, textareaCls, Toggle } from "./ui";

type TabKey = "auto" | "mass" | "single" | "log" | "settings";
type Segment = { name: string; count: number; phones: string[] };

const VARS = ["{name}", "{order}", "{amount}", "{tracking}", "{carrier}", "{day}", "{hour}", "{code}", "{link}", "{coupon}"];
const segs = (t: string) => Math.max(1, Math.ceil(t.length / 70));
const TARIFF = 1200;

/** پیامک — docs/admin-spec.md §4.16. */
export default function SmsPanel({
  sms: s0,
  log,
  stats,
  segments,
  connected,
  initialTab,
  initialTo,
  initialSegment,
  initialText,
}: {
  sms: SiteSettings["sms"];
  log: SmsEntry[];
  stats: { todayCost: number; monthCost: number; failed24: number };
  segments: Segment[];
  connected: boolean;
  initialTab?: TabKey;
  initialTo?: string;
  initialSegment?: string;
  /** prefilled mass text (from a campaign in بازاریابی) */
  initialText?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(initialTab ?? (initialTo ? "single" : "auto"));
  const [cfg, setCfg] = useState(s0);
  const [saved, setSaved] = useState(s0);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(cfg) !== JSON.stringify(saved);

  const [seg, setSeg] = useState(initialSegment ?? segments[0]?.name ?? "");
  const [massText, setMassText] = useState(initialText ?? "");
  const [extraPhones, setExtraPhones] = useState("");
  const [singleTo, setSingleTo] = useState(initialTo ?? "");
  const [singleText, setSingleText] = useState("");
  const [logFilter, setLogFilter] = useState<"all" | SmsEntry["kind"]>("all");

  const save = () =>
    start(async () => {
      await saveSettingsAction("sms", cfg);
      setSaved(cfg);
      toast("ذخیره شد");
      router.refresh();
    });

  const setTpl = (event: string, patch: Partial<SmsTemplate>) => setCfg({ ...cfg, templates: cfg.templates.map((t) => (t.event === event ? { ...t, ...patch } : t)) });
  const chosen = segments.find((x) => x.name === seg);
  const massPhones = [...new Set([...(chosen?.phones ?? []), ...extraPhones.split(/[\s,،]+/).filter(Boolean)])];
  const massCost = massPhones.length * segs(massText + (cfg.optOutKeyword ? ` لغو: ${cfg.optOutKeyword}` : "")) * TARIFF;
  const { todayCost, monthCost, failed24 } = stats;

  const filteredLog = log.filter((e) => logFilter === "all" || e.kind === logFilter);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-base font-bold lg:text-lg">پیامک</h1>
        <p className="mt-0.5 text-xs text-modi-gray-900">هر پیامکی که فروشگاه می‌فرستد، این‌جا نوشته، روشن/خاموش، ارسال و ثبت می‌شود.</p>
      </div>
      {!connected && (
        <div className="mb-4">
          <BackendNote>
            کاوه‌نگار متصل نیست — پیامک‌ها ثبت و در گزارش با وضعیت «شبیه‌سازی» نگه داشته می‌شوند ولی واقعاً ارسال نمی‌شوند. کلید API را در{" "}
            <Link href="/admin/settings/integrations" className="font-bold underline">تنظیمات → اتصال‌ها</Link> وارد کنید.
          </BackendNote>
        </div>
      )}
      <Tabs
        tabs={[
          { key: "auto", label: "پیامک‌های خودکار", count: cfg.templates.filter((t) => t.enabled).length },
          { key: "mass", label: "پیامک انبوه" },
          { key: "single", label: "ارسال تکی" },
          { key: "log", label: "گزارش ارسال", count: failed24 || undefined },
          { key: "settings", label: "تنظیمات پیامک" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "auto" && (
        <div className="space-y-3">
          {cfg.templates.map((t) => (
            <Card key={t.event}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-bold">{t.label}</span>
                    <span className="text-[11px] text-modi-gray-900">· {t.delay}</span>
                    {t.locked && <span className="rounded bg-modi-gray-500 px-1 text-[10px] text-modi-gray-900">همیشه فعال</span>}
                  </div>
                  <textarea value={t.text} onChange={(e) => setTpl(t.event, { text: e.target.value })} className={`${textareaCls} min-h-14`} />
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {VARS.map((v) => (
                      <button key={v} type="button" onClick={() => setTpl(t.event, { text: t.text + " " + v })} className="rounded bg-modi-gray-300 px-1.5 py-0.5 font-mono text-[10px] hover:bg-modi-purple-200" dir="ltr">{v}</button>
                    ))}
                    <span className="ms-auto text-[11px] text-modi-gray-900">{faNum(t.text.length)} کاراکتر · {faNum(segs(t.text))} بخش</span>
                  </div>
                </div>
                <div className="w-40 shrink-0">
                  <Toggle checked={t.enabled} onChange={(v) => !t.locked && setTpl(t.event, { enabled: v })} label={t.enabled ? "فعال" : "خاموش"} />
                  <button type="button" onClick={() => start(async () => { const r = await sendSmsAction(["09120000000"], t.text.replace("{order}", "۱۴۰۵-۰۰۰۱۳۱").replace("{code}", "۴۸۲۹۱۰").replace("{amount}", "۵۴۸٬۰۰۰").replace("{name}", "مو"), "single", t.event); toast(r.status === "simulated" ? "ثبت شد (شبیه‌سازی)" : "ارسال شد"); router.refresh(); })} className={`${btnSoft} mt-1 h-8 w-full text-[11px]`}>
                    ارسال آزمایشی به خودم
                  </button>
                </div>
              </div>
            </Card>
          ))}
          <p className="text-[11px] leading-5 text-modi-gray-900">الگوهایی که متنشان تغییر می‌کند باید در پنل کاوه‌نگار دوباره ثبت شوند؛ تا تایید، متن قبلی ارسال می‌شود.</p>
        </div>
      )}

      {tab === "mass" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div className="space-y-4">
            <Card title="۱. گیرندگان">
              <div className="flex flex-wrap gap-1.5">
                {segments.map((s) => (
                  <button key={s.name} type="button" onClick={() => setSeg(s.name)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${seg === s.name ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}>
                    {s.name} <span className="opacity-70">{faNum(s.count)}</span>
                  </button>
                ))}
              </div>
              <Field label="شماره‌های اضافی (اختیاری)" className="mt-3"><textarea value={extraPhones} onChange={(e) => setExtraPhones(e.target.value)} placeholder="هر خط یا با «،» جدا" dir="ltr" className={`${textareaCls} min-h-14 text-left`} /></Field>
            </Card>
            <Card title="۲. متن">
              <textarea value={massText} onChange={(e) => setMassText(e.target.value)} placeholder="سلام {name} عزیز…" className={textareaCls} />
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {["{name}", "{link}", "{coupon}"].map((v) => (
                  <button key={v} type="button" onClick={() => setMassText(massText + " " + v)} className="rounded bg-modi-gray-300 px-1.5 py-0.5 font-mono text-[10px]" dir="ltr">{v}</button>
                ))}
                <span className="ms-auto text-[11px] text-modi-gray-900">{faNum(massText.length)} کاراکتر · {faNum(segs(massText))} بخش · پانویس لغو: «{cfg.optOutKeyword}» خودکار اضافه می‌شود</span>
              </div>
            </Card>
          </div>
          <Card title="۳. پیش‌نمایش و ارسال">
            <div className="rounded-xl bg-modi-gray-300 p-3 text-xs leading-6">
              {massText.replace("{name}", "مریم احمدی").replace("{link}", "modilish.com").replace("{coupon}", "MD-XXXX") || "متن پیامک…"}
              <span className="block text-modi-gray-900">لغو: {cfg.optOutKeyword}</span>
            </div>
            <dl className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><dt>گیرندگان</dt><dd className="tabular-nums">{faNum(massPhones.length)}</dd></div>
              <div className="flex justify-between"><dt>خط</dt><dd>تبلیغاتی {cfg.promoLine || "(تنظیم نشده)"}</dd></div>
              <div className="flex justify-between font-bold"><dt>برآورد هزینه</dt><dd className="tabular-nums">{tomanShort(massCost)}</dd></div>
            </dl>
            {massPhones.length > 500 && <p className="mt-2 text-[11px] text-modi-warning">بیش از ۵۰۰ گیرنده — طبق سیاست، تایید دوم لازم است.</p>}
            <button
              type="button"
              disabled={pending || massPhones.length === 0 || !massText.trim()}
              onClick={() => start(async () => { const r = await sendSmsAction(massPhones, `${massText} لغو: ${cfg.optOutKeyword}`, "mass", "mass"); toast(`${faNum(r.count)} پیامک ${r.status === "simulated" ? "ثبت شد (شبیه‌سازی)" : "در صف ارسال"}`); setMassText(""); router.refresh(); setTab("log"); })}
              className={`${btnPrimary} mt-3 w-full`}
            >
              ارسال
            </button>
          </Card>
        </div>
      )}

      {tab === "single" && (
        <Card title="ارسال تکی" className="max-w-xl">
          <Field label="شماره موبایل"><input value={singleTo} onChange={(e) => setSingleTo(e.target.value)} dir="ltr" placeholder="09…" className={`${inputCls} text-left tabular-nums`} /></Field>
          <Field label="متن" className="mt-3"><textarea value={singleText} onChange={(e) => setSingleText(e.target.value)} className={textareaCls} /></Field>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-modi-gray-900">{faNum(segs(singleText))} بخش · خط خدماتی</span>
            <button type="button" disabled={pending || !singleTo.trim() || !singleText.trim()} onClick={() => start(async () => { const r = await sendSmsAction([singleTo], singleText, "single"); toast(r.status === "simulated" ? "ثبت شد (شبیه‌سازی)" : "در صف ارسال"); setSingleText(""); router.refresh(); })} className={btnPrimary}>ارسال</button>
          </div>
        </Card>
      )}

      {tab === "log" && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-xl bg-white px-3 py-2">هزینه امروز: <b className="tabular-nums">{tomanShort(todayCost)}</b></span>
            <span className="rounded-xl bg-white px-3 py-2">۳۰ روز: <b className="tabular-nums">{tomanShort(monthCost)}</b></span>
            <span className="rounded-xl bg-white px-3 py-2">اعتبار کاوه‌نگار: {connected ? "—" : "متصل نیست"}</span>
            <span className="ms-auto flex gap-1">
              {([["all", "همه"], ["auto", "خودکار"], ["mass", "انبوه"], ["single", "تکی"], ["otp", "OTP"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setLogFilter(k)} className={`rounded-full px-3 py-1.5 font-bold ${logFilter === k ? "bg-modi-purple-800 text-white" : "bg-white"}`}>{l}</button>
              ))}
            </span>
          </div>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
            {filteredLog.length === 0 ? (
              <EmptyState text="هنوز پیامکی ثبت نشده" small />
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[#ede9f2] text-[11px] font-bold text-modi-gray-900">
                    <th className="px-3 py-3 text-start">زمان</th><th className="px-3 py-3 text-start">گیرنده</th><th className="px-3 py-3 text-start">نوع</th><th className="px-3 py-3 text-start">متن</th><th className="px-3 py-3 text-start">وضعیت</th><th className="px-3 py-3 text-start">هزینه</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.slice(0, 200).map((e) => (
                    <tr key={e.id} className="border-b border-[#f3f0f7] last:border-b-0">
                      <td className="px-3 py-2 text-xs tabular-nums text-modi-gray-900">{formatJalali(e.at)}</td>
                      <td className="px-3 py-2 text-xs tabular-nums" dir="ltr">{e.orderKey ? <Link href={`/admin/orders/${e.orderKey}`} className="text-modi-purple-800">{e.phone}</Link> : e.phone}</td>
                      <td className="px-3 py-2 text-xs">{{ auto: "خودکار", mass: "انبوه", single: "تکی", otp: "OTP" }[e.kind]} · {e.template}</td>
                      <td className="max-w-[320px] truncate px-3 py-2 text-xs" title={e.text}>{e.text}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${e.status === "delivered" ? "bg-modi-success-bg text-modi-success" : e.status === "failed" ? "bg-modi-danger-bg text-modi-danger" : e.status === "simulated" ? "bg-modi-gray-500 text-modi-gray-900" : "bg-modi-info-bg text-modi-info"}`}>{{ delivered: "تحویل‌شده", queued: "در صف", failed: "ناموفق", simulated: "شبیه‌سازی" }[e.status]}</span></td>
                      <td className="px-3 py-2 text-xs tabular-nums">{tomanShort(e.costToman)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <Card title="خطوط ارسال">
            <Field label="خط خدماتی" hint="کد ورود و پیامک سفارش؛ به شماره‌های لیست سیاه هم می‌رسد"><input value={cfg.serviceLine} onChange={(e) => setCfg({ ...cfg, serviceLine: e.target.value })} dir="ltr" placeholder="1000…" className={`${inputCls} text-left`} /></Field>
            <Field label="خط تبلیغاتی" className="mt-3"><input value={cfg.promoLine} onChange={(e) => setCfg({ ...cfg, promoLine: e.target.value })} dir="ltr" placeholder="2000…" className={`${inputCls} text-left`} /></Field>
            <Field label="امضا" className="mt-3"><input value={cfg.signature} onChange={(e) => setCfg({ ...cfg, signature: e.target.value })} className={inputCls} /></Field>
          </Card>
          <Card title="محدودیت‌ها">
            <div className="grid grid-cols-2 gap-3">
              <Field label="ساعت سکوت از"><input type="time" value={cfg.quietFrom} onChange={(e) => setCfg({ ...cfg, quietFrom: e.target.value })} dir="ltr" className={inputCls} /></Field>
              <Field label="تا"><input type="time" value={cfg.quietTo} onChange={(e) => setCfg({ ...cfg, quietTo: e.target.value })} dir="ltr" className={inputCls} /></Field>
              <Field label="سقف روزانه"><input type="number" min={0} value={cfg.dailyCap} onChange={(e) => setCfg({ ...cfg, dailyCap: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} /></Field>
              <Field label="کلیدواژه لغو"><input value={cfg.optOutKeyword} onChange={(e) => setCfg({ ...cfg, optOutKeyword: e.target.value })} className={inputCls} /></Field>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-modi-gray-900">OTP: کد ۶ رقمی، انقضا ۵ دقیقه، ارسال مجدد ۱۲۰ ثانیه، حداکثر ۳ کد در ساعت، قفل پس از ۵ تلاش اشتباه (ثابت).</p>
          </Card>
        </div>
      )}
      <SaveBar dirty={dirty} saving={pending} onSave={save} onCancel={() => setCfg(saved)} />
    </div>
  );
}
