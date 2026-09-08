"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Product } from "@/lib/products";
import { newCampaign, newDiscountRule, newShippingRule, type Campaign, type Coupon, type DiscountRule, type DiscountScope, type ReferralSettings, type ShippingRule, type ShippingSettings } from "@/lib/siteContent";
import { cartTierDiscount, priceOf, ruleTypeLabel, scopeLabel, shippingFor, shippingRuleLabel } from "@/lib/pricing";
import { saveSettingsAction } from "@/lib/siteActions";
import { setCampaignStatusAction } from "@/lib/marketingActions";
import { faNum, tomanShort } from "@/lib/adminFormat";
import { randomCode } from "@/lib/uid";
import { toast } from "@/lib/toast";
import { BackendNote, btnDanger, btnPrimary, btnSoft, Card, ConfirmDialog, EmptyState, Field, inputCls, Tabs, textareaCls, Toggle } from "./ui";

type TabKey = "discounts" | "coupons" | "shipping" | "campaigns" | "segments" | "sms" | "referral" | "reports";

export type Reports = {
  byDay: { day: string; orders: number; sales: number }[];
  byMaterial: { name: string; meters: number; sales: number }[];
  byProvince: { name: string; orders: number }[];
  byMethod: { name: string; orders: number }[];
  coupons: { code: string; uses: number; revenue: number }[];
  refundsByReason: { reason: string; count: number }[];
  newVsReturning: { newCustomers: number; returning: number };
};

export type SegmentRow = { name: string; count: number; definition: string; phones: string[] };
export type SimProduct = Pick<Product, "slug" | "name" | "category" | "price" | "salePrice" | "unit" | "limit" | "attributes">;
export type ScopeOptions = { material: string[]; pattern: string[]; usage: string[]; products: { slug: string; name: string }[] };

type Props = {
  coupons: Coupon[];
  segments: SegmentRow[];
  reports: Reports;
  initialTab?: TabKey;
  rules: DiscountRule[];
  shipping: ShippingSettings;
  campaigns: Campaign[];
  referral: ReferralSettings;
  scopeOptions: ScopeOptions;
  simProducts: SimProduct[];
  campaignStats: Record<string, { orders: number; revenue: number }>;
  topReferrers: { code: string; name: string; phone: string; uses: number }[];
  methodPrice: number;
};

const blankCoupon = (): Coupon => ({ code: "", kind: "percent", value: 10, minCartToman: 0, maxDiscountToman: 0, validUntil: "", usageCap: 0, used: 0, active: true });

/** بازاریابی — docs/admin-spec.md §4.11. Every tab writes to Settings; the
 *  storefront prices through lib/pricing.ts so what is shown here is charged. */
export default function MarketingPanel(props: Props) {
  const { segments, reports, initialTab } = props;
  const [tab, setTab] = useState<TabKey>(initialTab ?? "discounts");

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-base font-bold lg:text-lg">بازاریابی</h1>
        <p className="mt-0.5 text-xs text-modi-gray-900">قوانین تخفیف، کدها، ارسال و کمپین‌ها بلافاصله روی قیمت‌های سایت و سبد خرید اعمال می‌شوند.</p>
      </div>
      <Tabs
        tabs={[
          { key: "discounts", label: "تخفیف‌ها", count: props.rules.filter((r) => r.active).length },
          { key: "coupons", label: "کدهای تخفیف", count: props.coupons.filter((c) => c.active).length },
          { key: "shipping", label: "تخفیف ارسال", count: props.shipping.freeEverywhere ? undefined : props.shipping.rules.filter((r) => r.active).length },
          { key: "campaigns", label: "کمپین‌ها", count: props.campaigns.filter((c) => c.status === "active").length },
          { key: "segments", label: "بخش‌بندی مشتریان", count: segments.length },
          { key: "sms", label: "پیامک انبوه" },
          { key: "referral", label: "معرفی دوستان" },
          { key: "reports", label: "گزارش‌ها" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "discounts" && <DiscountsTab rules={props.rules} scopeOptions={props.scopeOptions} simProducts={props.simProducts} />}
      {tab === "coupons" && <CouponsTab coupons={props.coupons} />}
      {tab === "shipping" && <ShippingTab shipping={props.shipping} scopeOptions={props.scopeOptions} segments={segments} methodPrice={props.methodPrice} simProducts={props.simProducts} rules={props.rules} />}
      {tab === "campaigns" && <CampaignsTab campaigns={props.campaigns} coupons={props.coupons} rules={props.rules} stats={props.campaignStats} />}
      {tab === "segments" && (
        <div className="space-y-3">
          {segments.map((s) => (
            <Card key={s.name}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{s.name} <span className="text-xs font-normal text-modi-gray-900">· {faNum(s.count)} مشتری</span></p>
                  <p className="text-[11px] text-modi-gray-900">{s.definition}</p>
                </div>
                <Link href={`/admin/customers?segment=${encodeURIComponent(s.name)}`} className={`${btnSoft} h-9 text-xs`}>مشتریان</Link>
                <Link href={`/admin/sms?tab=mass&segment=${encodeURIComponent(s.name)}`} className={`${btnSoft} h-9 text-xs`}>پیامک به این بخش</Link>
              </div>
            </Card>
          ))}
          <p className="text-[11px] text-modi-gray-900">بخش‌ها از سفارش‌های واقعی ساخته می‌شوند؛ برچسب‌های دلخواه را در صفحه هر مشتری بزنید تا در «ارسال رایگان برای بخش» و پیامک انبوه استفاده شوند.</p>
        </div>
      )}
      {tab === "sms" && (
        <Card>
          <p className="text-sm">ارسال انبوه از بخش <Link href="/admin/sms?tab=mass" className="font-bold text-modi-purple-800">پیامک → پیامک انبوه</Link> انجام می‌شود؛ انتخاب بخش مشتریان، برآورد هزینه و گزارش تحویل همان‌جاست.</p>
          <Link href="/admin/sms?tab=mass" className={`${btnPrimary} mt-3`}>رفتن به پیامک انبوه</Link>
        </Card>
      )}
      {tab === "referral" && <ReferralTab referral={props.referral} top={props.topReferrers} />}
      {tab === "reports" && <ReportsTab reports={reports} />}
    </div>
  );
}

/* ---------------------------------------------------------------- scope picker */

function ScopePicker({ scope, onChange, options }: { scope: DiscountScope; onChange: (s: DiscountScope) => void; options: ScopeOptions }) {
  const [q, setQ] = useState("");
  const toggle = (v: string) => onChange({ ...scope, values: scope.values.includes(v) ? scope.values.filter((x) => x !== v) : [...scope.values, v] });
  const list = scope.kind === "products" ? options.products.filter((p) => !q || p.name.includes(q) || p.slug.includes(q)).slice(0, 12) : [];
  return (
    <div className="space-y-2">
      <select value={scope.kind} onChange={(e) => onChange({ kind: e.target.value as DiscountScope["kind"], values: [] })} className={inputCls}>
        <option value="all">همه محصولات</option>
        <option value="material">جنس</option>
        <option value="pattern">طرح</option>
        <option value="usage">کاربرد</option>
        <option value="products">محصولات انتخابی</option>
      </select>
      {(scope.kind === "material" || scope.kind === "pattern" || scope.kind === "usage") && (
        <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
          {options[scope.kind].map((v) => (
            <button key={v} type="button" onClick={() => toggle(v)} className={`rounded-full px-2.5 py-1 text-[11px] ${scope.values.includes(v) ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}>{v}</button>
          ))}
        </div>
      )}
      {scope.kind === "products" && (
        <>
          <div className="flex flex-wrap gap-1">
            {scope.values.map((slug) => (
              <button key={slug} type="button" onClick={() => toggle(slug)} className="rounded-full bg-modi-purple-800 px-2.5 py-1 text-[11px] text-white" title="حذف">{options.products.find((p) => p.slug === slug)?.name ?? slug} ×</button>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی پارچه با نام یا کد…" className={`${inputCls} h-9`} />
          {q && (
            <ul className="max-h-40 overflow-y-auto rounded-xl bg-modi-gray-300 p-1">
              {list.map((p) => (
                <li key={p.slug}>
                  <button type="button" onClick={() => { toggle(p.slug); setQ(""); }} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-start text-xs hover:bg-white">
                    <span>{p.name}</span><span className="text-modi-gray-900">{p.slug}</span>
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="px-2 py-2 text-xs text-modi-gray-900">پیدا نشد</li>}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- discounts */

function DiscountsTab({ rules: r0, scopeOptions, simProducts }: { rules: DiscountRule[]; scopeOptions: ScopeOptions; simProducts: SimProduct[] }) {
  const router = useRouter();
  const [rules, setRules] = useState(r0);
  const [draft, setDraft] = useState<DiscountRule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [simSlug, setSimSlug] = useState(simProducts[0]?.slug ?? "");
  const [simQty, setSimQty] = useState(String(simProducts[0]?.limit ?? 1));

  const persist = (next: DiscountRule[], msg: string) =>
    start(async () => {
      await saveSettingsAction("discountRules", next);
      setRules(next);
      toast(msg);
      router.refresh();
    });

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast("نام قانون را وارد کنید");
    if (draft.type === "scope" && draft.percent <= 0 && draft.fixedToman <= 0) return toast("درصد یا مبلغ تخفیف را وارد کنید");
    if (draft.type === "volume" && draft.tiers.length === 0) return toast("حداقل یک پله تعریف کنید");
    if (draft.type === "cart" && draft.cartTiers.length === 0) return toast("حداقل یک پله تعریف کنید");
    if (draft.scope.kind !== "all" && draft.scope.values.length === 0 && draft.type !== "cart") return toast("مقدار گروه را انتخاب کنید");
    const exists = rules.some((r) => r.id === draft.id);
    persist(exists ? rules.map((r) => (r.id === draft.id ? draft : r)) : [draft, ...rules], exists ? "قانون ویرایش شد" : "قانون ساخته شد — روی سایت اعمال شد");
    setDraft(null);
  };

  const simProduct = simProducts.find((p) => p.slug === simSlug);
  const sim = simProduct ? priceOf(simProduct as Product, draft ? [...rules.filter((r) => r.id !== draft.id), draft] : rules, Number(simQty) || simProduct.limit) : null;
  const simSubtotal = sim ? sim.unit * (Number(simQty) || 1) : 0;
  const simCart = sim ? cartTierDiscount(simSubtotal, draft ? [...rules.filter((r) => r.id !== draft.id), draft] : rules) : { toman: 0, label: "" };

  const effect = (r: DiscountRule) =>
    r.type === "scope"
      ? r.percent > 0 ? `${faNum(r.percent)}٪` : `${tomanShort(r.fixedToman)}`
      : r.type === "volume"
        ? r.tiers.map((t) => `${faNum(t.minQty)}+ → ${faNum(t.percent)}٪`).join(" · ")
        : r.cartTiers.map((t) => `${tomanShort(t.minToman)}+ → ${faNum(t.percent)}٪`).join(" · ");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-modi-gray-900">اولویت بالاتر اول بررسی می‌شود؛ پیش‌فرض «بزرگ‌ترین تخفیف برنده است» مگر قانون «جمع‌شونده» باشد.</p>
          <button type="button" onClick={() => setDraft(newDiscountRule())} className={`${btnPrimary} h-9 shrink-0 text-xs`}>+ قانون جدید</button>
        </div>
        {rules.length === 0 ? (
          <div className="rounded-2xl bg-white"><EmptyState text="قانون تخفیفی تعریف نشده — تخفیف روی گروه، پلکانی متراژ یا پلکانی سبد بسازید" small action={<button type="button" onClick={() => setDraft(newDiscountRule())} className={btnSoft}>قانون جدید</button>} /></div>
        ) : (
          rules.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{r.name} <span className="ms-1 rounded-full bg-modi-gray-300 px-2 py-0.5 text-[10px] font-normal">{ruleTypeLabel(r.type)}</span>{r.flash && <span className="ms-1 rounded-full bg-modi-danger-bg px-2 py-0.5 text-[10px] font-normal text-modi-danger">فروش لحظه‌ای</span>}</p>
                  <p className="mt-1 text-xs text-modi-gray-900">{r.type === "cart" ? "روی جمع سبد" : scopeLabel(r.scope)} · {effect(r)}</p>
                  <p className="text-[11px] text-modi-gray-900">
                    اولویت {faNum(r.priority)} · {r.stacking === "stack" ? "جمع‌شونده" : "بزرگ‌ترین برنده"}
                    {(r.validFrom || r.validUntil) && ` · ${r.validFrom || "…"} تا ${r.validUntil || "…"}`}
                  </p>
                </div>
                <button type="button" onClick={() => persist(rules.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)), r.active ? "غیرفعال شد" : "فعال شد")} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.active ? "bg-modi-success-bg text-modi-success" : "bg-modi-gray-500 text-modi-gray-900"}`}>{r.active ? "فعال" : "غیرفعال"}</button>
                <button type="button" onClick={() => setDraft({ ...r })} className="text-xs text-modi-purple-800">ویرایش</button>
                <button type="button" onClick={() => setConfirmDelete(r.id)} className="text-xs text-modi-danger">حذف</button>
              </div>
            </Card>
          ))
        )}
        <ConfirmDialog open={!!confirmDelete} title="این قانون حذف شود؟" text="قیمت‌های سایت بلافاصله به حالت قبل برمی‌گردند." confirmLabel="حذف" danger onCancel={() => setConfirmDelete(null)} onConfirm={() => { persist(rules.filter((r) => r.id !== confirmDelete), "حذف شد"); setConfirmDelete(null); }} />
      </div>

      <div className="space-y-4">
        {draft && (
          <Card title={rules.some((r) => r.id === draft.id) ? "ویرایش قانون" : "قانون جدید"}>
            <div className="space-y-3">
              <Field label="نام (روی سایت به‌عنوان برچسب دیده می‌شود)" required><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="مثلاً حراج تابستانه کرپ" className={inputCls} /></Field>
              <Field label="نوع">
                <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as DiscountRule["type"] })} className={inputCls}>
                  <option value="scope">تخفیف روی گروه (درصد یا مبلغ)</option>
                  <option value="volume">پلکانی متراژ (هر قلم)</option>
                  <option value="cart">پلکانی سبد (جمع خرید)</option>
                </select>
              </Field>
              {draft.type !== "cart" && <Field label="روی کدام محصولات"><ScopePicker scope={draft.scope} onChange={(scope) => setDraft({ ...draft, scope })} options={scopeOptions} /></Field>}
              {draft.type === "scope" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="درصد تخفیف"><input type="number" min={0} max={100} value={draft.percent} onChange={(e) => setDraft({ ...draft, percent: Number(e.target.value) || 0, fixedToman: 0 })} className={`${inputCls} tabular-nums`} /></Field>
                  <Field label="یا مبلغ ثابت (تومان / واحد)"><input type="number" min={0} value={draft.fixedToman} onChange={(e) => setDraft({ ...draft, fixedToman: Number(e.target.value) || 0, percent: 0 })} className={`${inputCls} tabular-nums`} /></Field>
                </div>
              )}
              {draft.type === "volume" && (
                <TierEditor label="پله‌ها (از این متراژ به بالا → درصد)" unitLabel="متر" tiers={draft.tiers.map((t) => ({ min: t.minQty, percent: t.percent }))} onChange={(tiers) => setDraft({ ...draft, tiers: tiers.map((t) => ({ minQty: t.min, percent: t.percent })) })} />
              )}
              {draft.type === "cart" && (
                <TierEditor label="پله‌ها (از این مبلغ سبد به بالا → درصد)" unitLabel="تومان" tiers={draft.cartTiers.map((t) => ({ min: t.minToman, percent: t.percent }))} onChange={(tiers) => setDraft({ ...draft, cartTiers: tiers.map((t) => ({ minToman: t.min, percent: t.percent })) })} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="اولویت (بزرگ‌تر = اول)"><input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} /></Field>
                <Field label="هم‌پوشانی">
                  <select value={draft.stacking} onChange={(e) => setDraft({ ...draft, stacking: e.target.value as DiscountRule["stacking"] })} className={inputCls}>
                    <option value="largest">بزرگ‌ترین تخفیف برنده</option>
                    <option value="stack">جمع‌شونده با بقیه</option>
                  </select>
                </Field>
                <Field label="از تاریخ"><input type="date" value={draft.validFrom} onChange={(e) => setDraft({ ...draft, validFrom: e.target.value })} dir="ltr" className={inputCls} /></Field>
                <Field label="تا تاریخ"><input type="date" value={draft.validUntil} onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })} dir="ltr" className={inputCls} /></Field>
              </div>
              <Toggle checked={draft.flash} onChange={(flash) => setDraft({ ...draft, flash })} label="فروش لحظه‌ای" hint="با شمارش معکوس تا «تا تاریخ» در صفحه فروش فوق‌العاده" />
              <Toggle checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="فعال" />
              <div className="flex gap-2">
                <button type="button" disabled={pending} onClick={save} className={btnPrimary}>ذخیره</button>
                <button type="button" onClick={() => setDraft(null)} className={btnSoft}>انصراف</button>
              </div>
            </div>
          </Card>
        )}

        <Card title="شبیه‌ساز قیمت">
          <p className="mb-2 text-[11px] leading-5 text-modi-gray-900">همان محاسبه‌ای که سایت و سبد خرید انجام می‌دهند{draft ? " — با قانون در حال ویرایش" : ""}.</p>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <select value={simSlug} onChange={(e) => { setSimSlug(e.target.value); setSimQty(String(simProducts.find((p) => p.slug === e.target.value)?.limit ?? 1)); }} className={`${inputCls} h-9`}>
              {simProducts.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
            <input type="number" min={0} step={0.5} value={simQty} onChange={(e) => setSimQty(e.target.value)} className={`${inputCls} h-9 tabular-nums`} />
          </div>
          {sim && simProduct && (
            <dl className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-modi-gray-900">قیمت لیست</dt><dd className="tabular-nums">{tomanShort(sim.list)} / {simProduct.unit}</dd></div>
              <div className="flex justify-between font-bold"><dt>قیمت پرداختی</dt><dd className="tabular-nums">{tomanShort(sim.unit)} / {simProduct.unit}{sim.percentOff > 0 && <span className="ms-1 rounded bg-modi-danger-bg px-1 text-[10px] text-modi-danger">{faNum(sim.percentOff)}٪</span>}</dd></div>
              {sim.label && <div className="flex justify-between"><dt className="text-modi-gray-900">دلیل</dt><dd>{sim.label}</dd></div>}
              {sim.nextTierHint && <div className="flex justify-between"><dt className="text-modi-gray-900">پله بعدی</dt><dd>{sim.nextTierHint}</dd></div>}
              <div className="flex justify-between border-t border-[#f3f0f7] pt-1"><dt className="text-modi-gray-900">جمع {faNum(Number(simQty) || 0)} {simProduct.unit}</dt><dd className="tabular-nums">{tomanShort(simSubtotal)}</dd></div>
              {simCart.toman > 0 && <div className="flex justify-between text-modi-danger"><dt>{simCart.label}</dt><dd className="tabular-nums">− {tomanShort(simCart.toman)}</dd></div>}
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}

function TierEditor({ label, unitLabel, tiers, onChange }: { label: string; unitLabel: string; tiers: { min: number; percent: number }[]; onChange: (t: { min: number; percent: number }[]) => void }) {
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5 text-xs">
            <input type="number" min={0} value={t.min} onChange={(e) => onChange(tiers.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) || 0 } : x)))} className={`${inputCls} h-9 tabular-nums`} />
            <span className="text-modi-gray-900">{unitLabel} →</span>
            <input type="number" min={0} max={100} value={t.percent} onChange={(e) => onChange(tiers.map((x, j) => (j === i ? { ...x, percent: Number(e.target.value) || 0 } : x)))} className={`${inputCls} h-9 tabular-nums`} />
            <button type="button" onClick={() => onChange(tiers.filter((_, j) => j !== i))} className="h-9 w-8 rounded-lg bg-modi-danger-bg text-modi-danger">×</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...tiers, { min: tiers.length ? tiers[tiers.length - 1].min * 2 : 3, percent: tiers.length ? tiers[tiers.length - 1].percent + 5 : 5 }])} className={`${btnSoft} h-8 text-xs`}>+ پله</button>
      </div>
    </Field>
  );
}

/* ---------------------------------------------------------------- coupons */

function CouponsTab({ coupons: c0 }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(c0);
  const [draft, setDraft] = useState<Coupon>(blankCoupon());
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const persist = (next: Coupon[], msg: string) =>
    start(async () => {
      await saveSettingsAction("coupons", next);
      setCoupons(next);
      toast(msg);
      router.refresh();
    });

  const saveCoupon = () => {
    const code = draft.code.trim();
    if (!code) return toast("کد را وارد کنید");
    if (coupons.some((c) => c.code.toLowerCase() === code.toLowerCase() && c.code !== editing)) return toast("این کد قبلاً ساخته شده");
    const next = editing ? coupons.map((c) => (c.code === editing ? { ...draft, code } : c)) : [{ ...draft, code }, ...coupons];
    persist(next, editing ? "ویرایش شد" : "کد تخفیف ساخته شد — در سبد خرید قابل استفاده است");
    setDraft(blankCoupon());
    setEditing(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
        {coupons.length === 0 ? (
          <EmptyState text="هنوز کد تخفیفی ساخته نشده — اولین کد را در فرم کنار بسازید" small />
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#ede9f2] text-[11px] font-bold text-modi-gray-900">
                <th className="px-3 py-3 text-start">کد</th><th className="px-3 py-3 text-start">اثر</th><th className="px-3 py-3 text-start">شرایط</th><th className="px-3 py-3 text-start">استفاده</th><th className="px-3 py-3 text-start">وضعیت</th><th />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.code} className="border-b border-[#f3f0f7] last:border-b-0">
                  <td className="px-3 py-2 font-mono font-bold" dir="ltr">
                    {c.code}
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(c.code); toast("کپی شد"); }} className="ms-2 text-[10px] font-normal text-modi-purple-800">کپی</button>
                  </td>
                  <td className="px-3 py-2 text-xs">{c.kind === "percent" ? `${faNum(c.value)}٪` : c.kind === "fixed" ? tomanShort(c.value) : "ارسال رایگان"}{c.maxDiscountToman > 0 && ` (سقف ${tomanShort(c.maxDiscountToman)})`}</td>
                  <td className="px-3 py-2 text-xs text-modi-gray-900">{c.minCartToman > 0 ? `حداقل ${tomanShort(c.minCartToman)}` : "بدون حداقل"}{c.validUntil && ` · تا ${c.validUntil}`}</td>
                  <td className="px-3 py-2 text-xs tabular-nums">{faNum(c.used)}{c.usageCap > 0 ? ` / ${faNum(c.usageCap)}` : ""}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => persist(coupons.map((x) => (x.code === c.code ? { ...x, active: !x.active } : x)), c.active ? "غیرفعال شد" : "فعال شد")} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${c.active ? "bg-modi-success-bg text-modi-success" : "bg-modi-gray-500 text-modi-gray-900"}`}>
                      {c.active ? "فعال" : "غیرفعال"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-end">
                    <button type="button" onClick={() => { setDraft(c); setEditing(c.code); }} className="text-xs text-modi-purple-800">ویرایش</button>
                    <button type="button" onClick={() => persist(coupons.filter((x) => x.code !== c.code), "حذف شد")} className="ms-2 text-xs text-modi-danger">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Card title={editing ? `ویرایش ${editing}` : "کد تخفیف جدید"}>
        <div className="space-y-3">
          <Field label="کد" required>
            <div className="flex gap-2">
              <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} dir="ltr" className={`${inputCls} text-left font-mono`} />
              <button type="button" onClick={() => setDraft({ ...draft, code: "MD" + randomCode(6, true) })} className={`${btnSoft} h-10 shrink-0 text-xs`}>تولید</button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع">
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Coupon["kind"] })} className={inputCls}>
                <option value="percent">درصدی</option>
                <option value="fixed">مبلغ ثابت</option>
                <option value="free_shipping">ارسال رایگان</option>
              </select>
            </Field>
            {draft.kind !== "free_shipping" && (
              <Field label={draft.kind === "percent" ? "درصد" : "مبلغ (تومان)"}>
                <input type="number" min={0} value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} />
              </Field>
            )}
            {draft.kind === "percent" && (
              <Field label="حداکثر تخفیف (تومان)"><input type="number" min={0} value={draft.maxDiscountToman} onChange={(e) => setDraft({ ...draft, maxDiscountToman: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} /></Field>
            )}
            <Field label="حداقل مبلغ سبد"><input type="number" min={0} value={draft.minCartToman} onChange={(e) => setDraft({ ...draft, minCartToman: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} /></Field>
            <Field label="اعتبار تا"><input type="date" value={draft.validUntil} onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })} dir="ltr" className={inputCls} /></Field>
            <Field label="سقف استفاده (۰ = نامحدود)"><input type="number" min={0} value={draft.usageCap} onChange={(e) => setDraft({ ...draft, usageCap: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} /></Field>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={saveCoupon} className={btnPrimary}>{editing ? "ذخیره" : "ایجاد"}</button>
            {editing && <button type="button" onClick={() => { setDraft(blankCoupon()); setEditing(null); }} className={btnSoft}>انصراف</button>}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- shipping */

const provincesAll = ["تهران", "البرز", "اصفهان", "فارس", "خراسان رضوی", "آذربایجان شرقی", "آذربایجان غربی", "مازندران", "گیلان", "خوزستان", "کرمان", "یزد", "قم", "مرکزی", "همدان", "کرمانشاه", "قزوین", "زنجان", "گلستان", "سمنان", "لرستان", "اردبیل", "بوشهر", "هرمزگان", "کردستان", "چهارمحال و بختیاری", "سیستان و بلوچستان", "خراسان شمالی", "خراسان جنوبی", "ایلام", "کهگیلویه و بویراحمد"];

function ShippingTab({ shipping: s0, scopeOptions, segments, methodPrice, simProducts, rules }: { shipping: ShippingSettings; scopeOptions: ScopeOptions; segments: SegmentRow[]; methodPrice: number; simProducts: SimProduct[]; rules: DiscountRule[] }) {
  const router = useRouter();
  const [shipping, setShipping] = useState(s0);
  const [draft, setDraft] = useState<ShippingRule | null>(null);
  const [pending, start] = useTransition();
  const [simSub, setSimSub] = useState("500000");

  const persist = (next: ShippingSettings, msg: string) =>
    start(async () => {
      await saveSettingsAction("shipping", next);
      setShipping(next);
      toast(msg);
      router.refresh();
    });

  const saveRule = () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast("نام قانون را وارد کنید");
    if ((draft.type === "free_from_amount" || draft.type === "free_from_meters" || draft.type === "percent_off") && draft.threshold <= 0) return toast("مقدار آستانه را وارد کنید");
    if (draft.type === "free_scope" && draft.scope.kind !== "all" && draft.scope.values.length === 0) return toast("گروه را انتخاب کنید");
    if (draft.type === "free_segment" && !draft.segment) return toast("بخش مشتریان را انتخاب کنید");
    const exists = shipping.rules.some((r) => r.id === draft.id);
    persist({ ...shipping, rules: exists ? shipping.rules.map((r) => (r.id === draft.id ? draft : r)) : [draft, ...shipping.rules] }, "ذخیره شد");
    setDraft(null);
  };

  const sample = simProducts[0];
  const sim = sample ? shippingFor({ subtotal: Number(simSub) || 0, meters: (Number(simSub) || 0) / Math.max(1, priceOf(sample as Product, rules).unit), lines: [{ product: sample as Product, qty: 1 }], methodPrice }, shipping) : null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="space-y-3">
        <Card>
          <Toggle
            checked={shipping.freeEverywhere}
            onChange={(v) => persist({ ...shipping, freeEverywhere: v }, v ? "ارسال به همه‌جا رایگان شد" : "هزینه ارسال از روش‌های تنظیمات محاسبه می‌شود")}
            label="ارسال رایگان به سراسر ایران"
            hint={`تصمیم شماره ۲ مستند — با خاموش‌کردن، قیمت روش فعال (${tomanShort(methodPrice)}) از تنظیمات → ارسال و تحویل مبنا می‌شود و قوانین زیر روی آن اعمال می‌شوند.`}
          />
        </Card>
        <div className="flex items-center justify-between">
          <p className="text-xs text-modi-gray-900">قوانین به ترتیب بررسی می‌شوند؛ اولین قانونِ رایگان برنده است.</p>
          <button type="button" onClick={() => setDraft(newShippingRule())} className={`${btnPrimary} h-9 shrink-0 text-xs`}>+ قانون ارسال</button>
        </div>
        {shipping.rules.length === 0 ? (
          <div className="rounded-2xl bg-white"><EmptyState text="قانون ارسالی تعریف نشده — مثلاً «ارسال رایگان از ۵۰۰ هزار تومان»" small /></div>
        ) : (
          shipping.rules.map((r) => (
            <Card key={r.id} className={shipping.freeEverywhere ? "opacity-60" : ""}>
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{r.name}</p>
                  <p className="mt-1 text-xs text-modi-gray-900">
                    {shippingRuleLabel(r.type)}
                    {r.type === "free_from_amount" && ` · ${tomanShort(r.threshold)}`}
                    {r.type === "free_from_meters" && ` · ${faNum(r.threshold)} متر`}
                    {r.type === "percent_off" && ` · ${faNum(r.threshold)}٪`}
                    {r.type === "free_scope" && ` · ${scopeLabel(r.scope)}`}
                    {r.type === "free_segment" && ` · ${r.segment}`}
                    {r.provinces.length > 0 && ` · ${r.provinces.length === 1 ? r.provinces[0] : `${faNum(r.provinces.length)} استان`}`}
                    {(r.validFrom || r.validUntil) && ` · ${r.validFrom || "…"} تا ${r.validUntil || "…"}`}
                  </p>
                </div>
                <button type="button" onClick={() => persist({ ...shipping, rules: shipping.rules.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)) }, r.active ? "غیرفعال شد" : "فعال شد")} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.active ? "bg-modi-success-bg text-modi-success" : "bg-modi-gray-500 text-modi-gray-900"}`}>{r.active ? "فعال" : "غیرفعال"}</button>
                <button type="button" onClick={() => setDraft({ ...r })} className="text-xs text-modi-purple-800">ویرایش</button>
                <button type="button" onClick={() => persist({ ...shipping, rules: shipping.rules.filter((x) => x.id !== r.id) }, "حذف شد")} className="text-xs text-modi-danger">حذف</button>
              </div>
            </Card>
          ))
        )}
        <p className="text-[11px] text-modi-gray-900">کد تخفیف نوع «ارسال رایگان» هم در تب کدهای تخفیف قابل ساخت است.</p>
      </div>

      <div className="space-y-4">
        {draft && (
          <Card title={shipping.rules.some((r) => r.id === draft.id) ? "ویرایش قانون ارسال" : "قانون ارسال جدید"}>
            <div className="space-y-3">
              <Field label="نام" required><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} /></Field>
              <Field label="نوع">
                <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as ShippingRule["type"] })} className={inputCls}>
                  {(["free_from_amount", "free_from_meters", "free_scope", "free_segment", "percent_off"] as const).map((t) => <option key={t} value={t}>{shippingRuleLabel(t)}</option>)}
                </select>
              </Field>
              {draft.type === "free_from_amount" && <Field label="از مبلغ (تومان)"><input type="number" min={0} value={draft.threshold} onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} /></Field>}
              {draft.type === "free_from_meters" && <Field label="از متراژ"><input type="number" min={0} step={0.5} value={draft.threshold} onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} /></Field>}
              {draft.type === "percent_off" && <Field label="درصد تخفیف روی هزینه ارسال"><input type="number" min={0} max={100} value={draft.threshold} onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} /></Field>}
              {draft.type === "free_scope" && <Field label="گروه / محصول"><ScopePicker scope={draft.scope} onChange={(scope) => setDraft({ ...draft, scope })} options={scopeOptions} /></Field>}
              {draft.type === "free_segment" && (
                <Field label="بخش مشتریان">
                  <select value={draft.segment} onChange={(e) => setDraft({ ...draft, segment: e.target.value })} className={inputCls}>
                    <option value="">انتخاب…</option>
                    {segments.map((s) => <option key={s.name} value={s.name}>{s.name} ({faNum(s.count)})</option>)}
                    {["خیاط", "عمده", "VIP"].map((t) => <option key={t} value={t}>برچسب «{t}»</option>)}
                  </select>
                </Field>
              )}
              <Field label="فقط این استان‌ها (خالی = همه)">
                <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                  {provincesAll.map((p) => (
                    <button key={p} type="button" onClick={() => setDraft({ ...draft, provinces: draft.provinces.includes(p) ? draft.provinces.filter((x) => x !== p) : [...draft.provinces, p] })} className={`rounded-full px-2.5 py-1 text-[11px] ${draft.provinces.includes(p) ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}>{p}</button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="از تاریخ"><input type="date" value={draft.validFrom} onChange={(e) => setDraft({ ...draft, validFrom: e.target.value })} dir="ltr" className={inputCls} /></Field>
                <Field label="تا تاریخ"><input type="date" value={draft.validUntil} onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })} dir="ltr" className={inputCls} /></Field>
              </div>
              <Toggle checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="فعال" />
              <div className="flex gap-2">
                <button type="button" disabled={pending} onClick={saveRule} className={btnPrimary}>ذخیره</button>
                <button type="button" onClick={() => setDraft(null)} className={btnSoft}>انصراف</button>
              </div>
            </div>
          </Card>
        )}
        <Card title="شبیه‌ساز هزینه ارسال">
          <Field label="جمع سبد (تومان)"><input type="number" min={0} step={50000} value={simSub} onChange={(e) => setSimSub(e.target.value)} className={`${inputCls} h-9 tabular-nums`} /></Field>
          {sim && (
            <p className="mt-2 text-sm">هزینه ارسال: <b className="tabular-nums">{sim.label}</b>{sim.hint && <span className="block text-[11px] text-modi-gray-900">{sim.hint}</span>}</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- campaigns */

function CampaignsTab({ campaigns: c0, coupons, rules, stats }: { campaigns: Campaign[]; coupons: Coupon[]; rules: DiscountRule[]; stats: Record<string, { orders: number; revenue: number }> }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(c0);
  const [draft, setDraft] = useState<Campaign | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; to: "active" | "ended" } | null>(null);
  const [pending, start] = useTransition();

  const persist = (next: Campaign[], msg: string) =>
    start(async () => {
      await saveSettingsAction("campaigns", next);
      setCampaigns(next);
      toast(msg);
      router.refresh();
    });

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast("نام کمپین را وارد کنید");
    const slug = draft.slug.trim() || draft.name.trim().replace(/\s+/g, "-");
    const exists = campaigns.some((c) => c.id === draft.id);
    persist(exists ? campaigns.map((c) => (c.id === draft.id ? { ...draft, slug } : c)) : [{ ...draft, slug }, ...campaigns], "ذخیره شد");
    setDraft(null);
  };

  const setStatus = (id: string, to: "active" | "ended") =>
    start(async () => {
      try {
        await setCampaignStatusAction(id, to);
        setCampaigns(campaigns.map((c) => (c.id === id ? { ...c, status: to } : c)));
        toast(to === "active" ? "کمپین راه‌اندازی شد — کدها، قوانین و نوار اعلان فعال شدند" : "کمپین متوقف شد");
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "انجام نشد");
      }
      setConfirm(null);
    });

  const statusPill = (s: Campaign["status"]) =>
    s === "active" ? "bg-modi-success-bg text-modi-success" : s === "ended" ? "bg-modi-gray-500 text-modi-gray-900" : "bg-modi-warning-bg text-modi-warning";
  const statusLabel = { draft: "پیش‌نویس", active: "در حال اجرا", ended: "پایان‌یافته" };
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-modi-gray-900">کمپین، پوشه‌ای است که صفحه فرود، قوانین تخفیف، کدها و نوار اعلان را با هم راه‌اندازی و متوقف می‌کند.</p>
          <button type="button" onClick={() => setDraft(newCampaign())} className={`${btnPrimary} h-9 shrink-0 text-xs`}>+ کمپین جدید</button>
        </div>
        {campaigns.length === 0 ? (
          <div className="rounded-2xl bg-white"><EmptyState text="کمپینی ساخته نشده — مثلاً «حراج پاییزه»: کد تخفیف + قانون + نوار اعلان + پیامک" small action={<button type="button" onClick={() => setDraft(newCampaign())} className={btnSoft}>کمپین جدید</button>} /></div>
        ) : (
          campaigns.map((c) => {
            const st = stats[c.id] ?? { orders: 0, revenue: 0 };
            return (
              <Card key={c.id}>
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{c.name} <span className={`ms-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusPill(c.status)}`}>{statusLabel[c.status]}</span></p>
                    <p className="mt-1 text-xs text-modi-gray-900">{c.startsAt || "…"} تا {c.endsAt || "…"}{c.goal && ` · هدف: ${c.goal}`}</p>
                    <p className="text-[11px] text-modi-gray-900">
                      {c.couponCodes.length > 0 && `کدها: ${c.couponCodes.join("، ")} · `}
                      {c.discountRuleIds.length > 0 && `${faNum(c.discountRuleIds.length)} قانون · `}
                      {c.announcementText && "نوار اعلان · "}
                      {c.landing === "offer" && "صفحه فروش فوق‌العاده"}
                    </p>
                    {(c.status !== "draft" || st.orders > 0) && (
                      <p className="mt-1 text-xs"><b className="tabular-nums">{faNum(st.orders)}</b> سفارش با کدهای کمپین · <b className="tabular-nums">{tomanShort(st.revenue)}</b></p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {c.status !== "active" ? (
                      <button type="button" disabled={pending} onClick={() => setConfirm({ id: c.id, to: "active" })} className={`${btnPrimary} h-8 text-xs`}>راه‌اندازی</button>
                    ) : (
                      <button type="button" disabled={pending} onClick={() => setConfirm({ id: c.id, to: "ended" })} className={`${btnDanger} h-8 text-xs`}>توقف</button>
                    )}
                    <span className="flex gap-2">
                      <button type="button" onClick={() => setDraft({ ...c })} className="text-xs text-modi-purple-800">ویرایش</button>
                      {c.landing === "offer" && <Link href="/admin/offer" className="text-xs text-modi-purple-800">صفحه فرود</Link>}
                      <button type="button" onClick={() => persist(campaigns.filter((x) => x.id !== c.id), "حذف شد")} className="text-xs text-modi-danger">حذف</button>
                    </span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
        <ConfirmDialog
          open={!!confirm}
          title={confirm?.to === "active" ? "کمپین راه‌اندازی شود؟" : "کمپین متوقف شود؟"}
          text={confirm?.to === "active" ? "کدهای تخفیف و قوانین انتخاب‌شده فعال و نوار اعلان در هدر سایت روشن می‌شود." : "کدها و قوانین کمپین غیرفعال و نوار اعلان خاموش می‌شود."}
          confirmLabel={confirm?.to === "active" ? "راه‌اندازی" : "توقف"}
          danger={confirm?.to === "ended"}
          onCancel={() => setConfirm(null)}
          onConfirm={() => confirm && setStatus(confirm.id, confirm.to)}
        />
      </div>

      {draft ? (
        <Card title={campaigns.some((c) => c.id === draft.id) ? "ویرایش کمپین" : "کمپین جدید"}>
          <div className="space-y-3">
            <Field label="نام" required><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="مثلاً حراج پاییزه" className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="شروع"><input type="date" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} dir="ltr" className={inputCls} /></Field>
              <Field label="پایان"><input type="date" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} dir="ltr" className={inputCls} /></Field>
            </div>
            <Field label="هدف (برای گزارش)"><input value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} placeholder="مثلاً ۲۰ میلیون فروش کرپ" className={inputCls} /></Field>
            <Field label="کدهای تخفیف کمپین" hint="با راه‌اندازی فعال و با توقف غیرفعال می‌شوند">
              <div className="flex flex-wrap gap-1">
                {coupons.length === 0 && <span className="text-[11px] text-modi-gray-900">کدی ساخته نشده — در تب کدهای تخفیف بسازید.</span>}
                {coupons.map((c) => (
                  <button key={c.code} type="button" onClick={() => setDraft({ ...draft, couponCodes: toggleIn(draft.couponCodes, c.code) })} className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${draft.couponCodes.includes(c.code) ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}>{c.code}</button>
                ))}
              </div>
            </Field>
            <Field label="قوانین تخفیف کمپین">
              <div className="flex flex-wrap gap-1">
                {rules.length === 0 && <span className="text-[11px] text-modi-gray-900">قانونی ساخته نشده — در تب تخفیف‌ها بسازید.</span>}
                {rules.map((r) => (
                  <button key={r.id} type="button" onClick={() => setDraft({ ...draft, discountRuleIds: toggleIn(draft.discountRuleIds, r.id) })} className={`rounded-full px-2.5 py-1 text-[11px] ${draft.discountRuleIds.includes(r.id) ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}>{r.name}</button>
                ))}
              </div>
            </Field>
            <Field label="متن نوار اعلان هدر" hint="خالی = بدون نوار"><input value={draft.announcementText} onChange={(e) => setDraft({ ...draft, announcementText: e.target.value })} placeholder="مثلاً ۲۰٪ تخفیف پاییزه تا جمعه" className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="لینک نوار اعلان"><input value={draft.announcementHref} onChange={(e) => setDraft({ ...draft, announcementHref: e.target.value })} dir="ltr" className={`${inputCls} text-left`} /></Field>
              <Field label="صفحه فرود">
                <select value={draft.landing} onChange={(e) => setDraft({ ...draft, landing: e.target.value as Campaign["landing"] })} className={inputCls}>
                  <option value="offer">فروش فوق‌العاده (/offer)</option>
                  <option value="none">بدون صفحه فرود</option>
                </select>
              </Field>
            </div>
            <Field label="متن پیامک کمپین" hint="از «پیامک انبوه» به بخش دلخواه بفرستید">
              <textarea value={draft.smsText} onChange={(e) => setDraft({ ...draft, smsText: e.target.value })} className={`${textareaCls} min-h-16`} />
            </Field>
            {draft.smsText.trim() && (
              <Link href={`/admin/sms?tab=mass&text=${encodeURIComponent(draft.smsText)}`} className={`${btnSoft} h-9 text-xs`}>ارسال این متن از پیامک انبوه</Link>
            )}
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={save} className={btnPrimary}>ذخیره</button>
              <button type="button" onClick={() => setDraft(null)} className={btnSoft}>انصراف</button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="چطور کار می‌کند">
          <ol className="list-decimal space-y-1.5 ps-5 text-xs leading-6 text-modi-gray-900">
            <li>کد تخفیف و قانون تخفیف را در تب‌های خودشان بسازید (می‌توانند غیرفعال بمانند).</li>
            <li>کمپین بسازید و آن‌ها را به آن وصل کنید؛ متن نوار اعلان و پیامک را بنویسید.</li>
            <li>صفحه فرود را در <Link href="/admin/offer" className="font-bold text-modi-purple-800">فروش فوق‌العاده</Link> بچینید.</li>
            <li>«راه‌اندازی» همه را با هم روشن می‌کند؛ «توقف» خاموش. آمار سفارش‌های کمپین همین‌جا جمع می‌شود.</li>
          </ol>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- referral */

function ReferralTab({ referral: r0, top }: { referral: ReferralSettings; top: { code: string; name: string; phone: string; uses: number }[] }) {
  const router = useRouter();
  const [v, setV] = useState(r0);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(v) !== JSON.stringify(r0);
  const rewardLabel = (k: string, val: number) => (k === "percent" ? `${faNum(val)}٪ تخفیف` : k === "fixed" ? `${tomanShort(val)} تخفیف` : `${tomanShort(val)} اعتبار کیف پول`);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <Card title="پاداش دوطرفه">
        <Toggle checked={v.enabled} onChange={(enabled) => setV({ ...v, enabled })} label="معرفی دوستان فعال باشد" hint="فیلد «کد معرف» در مرحله آدرس سایت نمایش داده می‌شود" />
        <p className="mt-2 rounded-xl bg-modi-gray-300 px-3 py-2 text-[11px] leading-5 text-modi-gray-900">
          کد هر مشتری: <span dir="ltr" className="font-mono font-bold">MD</span> + پنج رقم آخر موبایل (مثلاً <span dir="ltr" className="font-mono">MD45678</span>). مشتری معرفی‌شده کد را در آدرس وارد می‌کند؛ پاداش معرف پس از پرداخت سفارش ثبت می‌شود.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="پاداش معرفی‌شده (خریدار جدید)">
            <select value={v.refereeReward.kind} onChange={(e) => setV({ ...v, refereeReward: { ...v.refereeReward, kind: e.target.value as "percent" | "fixed" } })} className={inputCls}>
              <option value="percent">درصد تخفیف</option>
              <option value="fixed">مبلغ تخفیف</option>
            </select>
          </Field>
          <Field label={v.refereeReward.kind === "percent" ? "درصد" : "تومان"}><input type="number" min={0} value={v.refereeReward.value} onChange={(e) => setV({ ...v, refereeReward: { ...v.refereeReward, value: Number(e.target.value) || 0 } })} className={`${inputCls} tabular-nums`} /></Field>
          <Field label="پاداش معرف">
            <select value={v.referrerReward.kind} onChange={(e) => setV({ ...v, referrerReward: { ...v.referrerReward, kind: e.target.value as "percent" | "fixed" | "wallet" } })} className={inputCls}>
              <option value="wallet">اعتبار کیف پول</option>
              <option value="percent">درصد تخفیف خرید بعدی</option>
              <option value="fixed">مبلغ تخفیف خرید بعدی</option>
            </select>
          </Field>
          <Field label={v.referrerReward.kind === "percent" ? "درصد" : "تومان"}><input type="number" min={0} value={v.referrerReward.value} onChange={(e) => setV({ ...v, referrerReward: { ...v.referrerReward, value: Number(e.target.value) || 0 } })} className={`${inputCls} tabular-nums`} /></Field>
          <Field label="سقف استفاده هر کد (۰ = نامحدود)"><input type="number" min={0} value={v.maxUsesPerCode} onChange={(e) => setV({ ...v, maxUsesPerCode: Number(e.target.value) || 0 })} className={`${inputCls} tabular-nums`} /></Field>
        </div>
        <div className="mt-2"><Toggle checked={v.firstOrderOnly} onChange={(firstOrderOnly) => setV({ ...v, firstOrderOnly })} label="فقط برای اولین سفارش معرفی‌شده" /></div>
        {v.referrerReward.kind !== "wallet" && <div className="mt-2"><BackendNote>تخفیف «خرید بعدی» برای معرف به حساب مشتری نیاز دارد؛ تا آن زمان به‌صورت اعتبار کیف پول ثبت می‌شود.</BackendNote></div>}
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={!dirty || pending} onClick={() => start(async () => { await saveSettingsAction("referral", v); toast("ذخیره شد"); router.refresh(); })} className={btnPrimary}>ذخیره</button>
          {dirty && <button type="button" onClick={() => setV(r0)} className={btnSoft}>انصراف</button>}
        </div>
      </Card>
      <Card title="برترین معرف‌ها">
        {top.length === 0 ? (
          <p className="text-xs text-modi-gray-900">هنوز سفارشی با کد معرف ثبت نشده. خلاصه فعلی: معرفی‌شده {rewardLabel(v.refereeReward.kind, v.refereeReward.value)} · معرف {rewardLabel(v.referrerReward.kind, v.referrerReward.value)}.</p>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="text-[11px] text-modi-gray-900"><th className="py-2 text-start">کد</th><th className="py-2 text-start">مشتری</th><th className="py-2 text-end">معرفی</th></tr></thead>
            <tbody>
              {top.map((t) => (
                <tr key={t.code} className="border-t border-[#f3f0f7]">
                  <td className="py-2 font-mono" dir="ltr">{t.code}</td>
                  <td className="py-2">{t.phone ? <Link href={`/admin/customers/${t.phone}`} className="text-modi-purple-800">{t.name || t.phone}</Link> : "—"}</td>
                  <td className="py-2 text-end tabular-nums">{faNum(t.uses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- reports */

function ReportsTab({ reports }: { reports: Reports }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="فروش ۳۰ روز اخیر (روزانه)">
        {reports.byDay.every((d) => d.orders === 0) ? (
          <p className="text-xs text-modi-gray-900">فروشی ثبت نشده.</p>
        ) : (
          <div className="flex h-32 items-end gap-0.5">
            {reports.byDay.map((d) => {
              const max = Math.max(1, ...reports.byDay.map((x) => x.sales));
              return <span key={d.day} title={`${d.day}: ${faNum(d.orders)} سفارش · ${tomanShort(d.sales)}`} className="flex-1 rounded-t bg-modi-purple-500" style={{ height: `${Math.max(2, (d.sales / max) * 100)}%` }} />;
            })}
          </div>
        )}
      </Card>
      <Card title="بر اساس جنس (متر)">
        <ul className="space-y-1.5 text-sm">
          {reports.byMaterial.length === 0 && <li className="text-xs text-modi-gray-900">—</li>}
          {reports.byMaterial.map((m) => (
            <li key={m.name} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs">{m.name}</span>
              <span className="h-2 flex-1 rounded-full bg-modi-gray-500"><span className="block h-2 rounded-full bg-modi-purple-800" style={{ width: `${Math.round((m.meters / Math.max(1, reports.byMaterial[0].meters)) * 100)}%` }} /></span>
              <span className="w-28 shrink-0 text-end text-[11px] tabular-nums text-modi-gray-900">{faNum(m.meters)} متر · {tomanShort(m.sales)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="بر اساس استان / روش تحویل">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <ul className="space-y-1">{reports.byProvince.map((p) => <li key={p.name} className="flex justify-between"><span>{p.name}</span><span className="tabular-nums">{faNum(p.orders)}</span></li>)}</ul>
          <ul className="space-y-1">{reports.byMethod.map((p) => <li key={p.name} className="flex justify-between"><span>{p.name}</span><span className="tabular-nums">{faNum(p.orders)}</span></li>)}</ul>
        </div>
      </Card>
      <Card title="کدهای تخفیف · مشتریان · مرجوعی">
        <div className="space-y-2 text-xs">
          <p>مشتری جدید: <b className="tabular-nums">{faNum(reports.newVsReturning.newCustomers)}</b> · بازگشتی: <b className="tabular-nums">{faNum(reports.newVsReturning.returning)}</b></p>
          <p>کدهای استفاده‌شده: {reports.coupons.length === 0 ? "—" : reports.coupons.map((c) => `${c.code} (${faNum(c.uses)} · ${tomanShort(c.revenue)})`).join("، ")}</p>
          <p>مرجوعی/لغو بر اساس دلیل: {reports.refundsByReason.length === 0 ? "—" : reports.refundsByReason.map((r) => `${r.reason} (${faNum(r.count)})`).join("، ")}</p>
        </div>
      </Card>
    </div>
  );
}
