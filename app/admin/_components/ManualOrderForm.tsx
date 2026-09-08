"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Product } from "@/lib/products";
import type { Order, PaymentMethod } from "@/lib/orders";
import type { DiscountRule, ShippingSettings } from "@/lib/siteContent";
import { cartTierDiscount, priceOf, shippingFor } from "@/lib/pricing";
import { createOrderAction } from "@/lib/orderActions";
import { toast } from "@/lib/toast";
import { tomanShort, faNum } from "@/lib/adminFormat";
import { btnPrimary, btnSoft, Card, Field, inputCls, PageHeader, textareaCls } from "./ui";

type Line = { slug: string; qty: number; note: string };
type FormProduct = Pick<Product, "slug" | "name" | "image" | "price" | "salePrice" | "unit" | "limit" | "meters" | "category" | "attributes">;

/** «ثبت سفارش دستی» — docs/admin-spec.md §4.2.5: mirrors the customer checkout,
 *  priced through the same resolver (lib/pricing.ts) so totals match the order. */
export default function ManualOrderForm({
  products,
  provinces,
  defaultProvince,
  pickupDays,
  pickupHours,
  pickupEnabled,
  codEnabled,
  knownCustomers,
  initialPhone = "",
  rules = [],
  shipping,
  methodPrice = 0,
}: {
  products: FormProduct[];
  provinces: string[];
  defaultProvince: string;
  pickupDays: string[];
  pickupHours: string[];
  pickupEnabled: boolean;
  codEnabled: boolean;
  knownCustomers: { name: string; phone: string }[];
  initialPhone?: string;
  rules?: DiscountRule[];
  shipping?: ShippingSettings;
  methodPrice?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<"post" | "pickup">("post");
  const [addr, setAddr] = useState({ province: defaultProvince, city: "", postcode: "", address: "", carrier: "پست پیشتاز" });
  const [pickup, setPickup] = useState({ day: pickupDays[0] ?? "", hour: pickupHours[0] ?? "" });
  const [discount, setDiscount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("link");
  const [paymentRef, setPaymentRef] = useState("");
  const [note, setNote] = useState("");

  const matches = useMemo(() => (q.trim() ? products.filter((p) => p.name.includes(q) || p.slug.includes(q)).slice(0, 8) : []), [q, products]);
  const known = knownCustomers.find((c) => c.phone.replace(/\D/g, "").endsWith(phone.replace(/\D/g, "").slice(-10)) && phone.replace(/\D/g, "").length >= 10);

  const priced = lines.map((l) => {
    const p = products.find((x) => x.slug === l.slug)!;
    const unitPrice = priceOf(p as Product, rules, l.qty).unit;
    return { ...l, p, unitPrice, total: Math.round(unitPrice * l.qty) };
  });
  const subtotal = priced.reduce((s, l) => s + l.total, 0);
  const tier = cartTierDiscount(subtotal, rules);
  const disc = Math.min(subtotal - tier.toman, Number(discount) || 0);
  const ship =
    method === "pickup" || !shipping
      ? { fee: 0, label: "رایگان" }
      : shippingFor({ subtotal: subtotal - tier.toman, meters: priced.reduce((s, l) => s + (l.p.unit === "متر" ? l.qty : 0), 0), lines: priced.map((l) => ({ product: l.p as Product, qty: l.qty })), province: addr.province, methodPrice }, shipping);
  const total = subtotal - tier.toman - disc + ship.fee;

  const submit = () => {
    setError(null);
    const ph = phone.replace(/\D/g, "");
    if (!/^0?9\d{9}$/.test(ph)) return setError("شماره موبایل معتبر نیست.");
    if (!(name || known?.name)) return setError("نام مشتری را وارد کنید.");
    if (lines.length === 0) return setError("حداقل یک قلم اضافه کنید.");
    for (const l of priced) {
      if (l.qty < l.p.limit) return setError(`حداقل سفارش «${l.p.name}» ${faNum(l.p.limit)} ${l.p.unit} است.`);
      if (l.qty > l.p.meters) return setError(`فقط ${faNum(l.p.meters)} ${l.p.unit} از «${l.p.name}» موجود است.`);
    }
    if (method === "post" && (!addr.city || addr.address.length < 10)) return setError("آدرس ارسال را کامل کنید.");
    if (disc > 0 && !discountReason.trim()) return setError("دلیل تخفیف دستی الزامی است.");

    const customer: Order["customer"] = { name: name || known!.name, phone: ph.startsWith("0") ? ph : "0" + ph };
    const delivery: Order["delivery"] =
      method === "post"
        ? { type: "post", carrier: addr.carrier, recipient: customer.name, mobile: customer.phone, province: addr.province, city: addr.city, postcode: addr.postcode, address: addr.address }
        : { type: "pickup", day: pickup.day, hour: pickup.hour, cod: payment === "cod" };

    start(async () => {
      try {
        const { key } = await createOrderAction({
          customer,
          delivery,
          lines: lines.map((l) => ({ slug: l.slug, qty: l.qty, note: l.note || undefined })),
          discount: disc,
          customerNote: [note, disc > 0 ? `تخفیف دستی: ${discountReason}` : ""].filter(Boolean).join(" · ") || undefined,
          paymentMethod: payment,
          source: "manual",
          markPaid: payment === "card_to_card" || payment === "cash" || payment === "wallet",
          paymentRef: paymentRef || undefined,
        });
        toast("سفارش ثبت شد");
        router.push(`/admin/orders/${key}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "ثبت نشد");
      }
    });
  };

  const payments: { key: PaymentMethod; label: string; hint: string }[] = [
    { key: "link", label: "لینک پرداخت", hint: "پیامک لینک زرین‌پال؛ سفارش در انتظار پرداخت می‌ماند" },
    ...(method === "pickup" && codEnabled ? [{ key: "cod" as PaymentMethod, label: "پرداخت در محل", hint: "هنگام تحویل حضوری" }] : []),
    { key: "card_to_card", label: "کارت‌به‌کارت", hint: "پرداخت‌شده ثبت می‌شود؛ شماره پیگیری را وارد کنید" },
    { key: "cash", label: "نقدی", hint: "پرداخت‌شده ثبت می‌شود" },
  ];

  return (
    <div>
      <PageHeader title="ثبت سفارش دستی" subtitle="سفارش تلفنی، تلگرامی یا حضوری — همان مسیر پرداخت مشتری" back={{ href: "/admin/orders", label: "سفارش‌ها" }} />
      {error && <p className="mb-3 rounded-xl bg-modi-danger-bg px-3 py-2 text-xs font-bold text-modi-danger">{error}</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card title="۱. مشتری">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Field label="شماره موبایل" required hint={known ? `مشتری قبلی: ${known.name}` : "با این شماره جستجو می‌شود؛ اگر نبود، مشتری جدید ساخته می‌شود"}>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="09…" className={`${inputCls} text-left tabular-nums`} />
              </Field>
              <Field label="نام" required={!known}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={known?.name} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="۲. اقلام">
            <div className="relative">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی پارچه با نام یا کد…" className={inputCls} />
              {matches.length > 0 && (
                <ul className="absolute inset-x-0 top-11 z-10 max-h-64 overflow-y-auto rounded-xl bg-white p-1 shadow-[0_8px_24px_-8px_rgba(43,39,64,0.4)]">
                  {matches.map((p) => (
                    <li key={p.slug}>
                      <button type="button" onClick={() => { setLines([...lines, { slug: p.slug, qty: p.limit, note: "" }]); setQ(""); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-xs hover:bg-modi-purple-200">
                        <Image src={p.image} alt="" width={28} height={28} className="h-7 w-7 rounded object-cover" />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="tabular-nums text-modi-gray-900">{faNum(p.meters)} {p.unit} · {tomanShort(priceOf(p as Product, rules).unit)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ul className="mt-3 divide-y divide-[#f3f0f7]">
              {priced.map((l, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-2">
                  <Image src={l.p.image} alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">{l.p.name}</span>
                  <span className="flex items-center gap-1 text-xs">
                    <input type="number" step={l.p.unit === "متر" ? 0.1 : 1} min={l.p.limit} max={l.p.meters} value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} className={`${inputCls} h-9 w-20 tabular-nums`} />
                    {l.p.unit}
                  </span>
                  <input value={l.note} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder="توضیح برش (مثلاً یک‌تکه)" className={`${inputCls} h-9 w-40`} />
                  <span className="w-28 text-end text-xs font-bold tabular-nums">{tomanShort(l.total)}</span>
                  <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="h-8 w-8 rounded-lg bg-modi-danger-bg text-modi-danger">×</button>
                </li>
              ))}
              {priced.length === 0 && <li className="py-4 text-center text-xs text-modi-gray-900">هنوز قلمی اضافه نشده.</li>}
            </ul>
          </Card>

          <Card title="۳. تحویل">
            <div className="mb-3 flex gap-2">
              {(pickupEnabled ? (["post", "pickup"] as const) : (["post"] as const)).map((m) => (
                <button key={m} type="button" onClick={() => { setMethod(m); if (m === "post" && payment === "cod") setPayment("link"); }} className={`h-10 flex-1 rounded-xl text-sm font-bold ${method === m ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}>
                  {m === "post" ? "ارسال به آدرس" : "دریافت حضوری"}
                </button>
              ))}
            </div>
            {method === "post" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="استان"><select value={addr.province} onChange={(e) => setAddr({ ...addr, province: e.target.value })} className={inputCls}>{provinces.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
                <Field label="شهر" required><input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className={inputCls} /></Field>
                <Field label="کد پستی"><input value={addr.postcode} onChange={(e) => setAddr({ ...addr, postcode: e.target.value })} dir="ltr" className={`${inputCls} text-left tabular-nums`} /></Field>
                <Field label="روش ارسال"><select value={addr.carrier} onChange={(e) => setAddr({ ...addr, carrier: e.target.value })} className={inputCls}>{["پست پیشتاز", "تیپاکس", "پیک تهران"].map((c) => <option key={c} value={c}>{c} · {ship.label}</option>)}</select></Field>
                <Field label="آدرس دقیق" required className="col-span-2"><textarea value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} className={`${textareaCls} min-h-16`} /></Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="روز"><select value={pickup.day} onChange={(e) => setPickup({ ...pickup, day: e.target.value })} className={inputCls}>{pickupDays.map((d) => <option key={d} value={d}>{d}</option>)}</select></Field>
                <Field label="ساعت"><select value={pickup.hour} onChange={(e) => setPickup({ ...pickup, hour: e.target.value })} className={inputCls}>{pickupHours.map((h) => <option key={h} value={h}>{h}</option>)}</select></Field>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card title="۴. تخفیف و پرداخت">
            <div className="grid grid-cols-2 gap-3">
              <Field label="تخفیف دستی (تومان)"><input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="numeric" className={`${inputCls} tabular-nums`} /></Field>
              <Field label="دلیل تخفیف" required={disc > 0}><input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} className={inputCls} /></Field>
            </div>
            <div className="mt-3 space-y-1.5">
              {payments.map((p) => (
                <button key={p.key} type="button" onClick={() => setPayment(p.key)} className={`w-full rounded-xl px-3 py-2 text-start ${payment === p.key ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}>
                  <span className="block text-xs font-bold">{p.label}</span>
                  <span className={`block text-[10px] ${payment === p.key ? "text-white/80" : "text-modi-gray-900"}`}>{p.hint}</span>
                </button>
              ))}
            </div>
            {payment === "card_to_card" && (
              <Field label="شماره پیگیری" className="mt-3"><input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} dir="ltr" className={`${inputCls} text-left`} /></Field>
            )}
            <Field label="توضیحات سفارش" className="mt-3"><textarea value={note} onChange={(e) => setNote(e.target.value)} className={`${textareaCls} min-h-14`} /></Field>
            <dl className="mt-3 space-y-1 border-t border-[#f3f0f7] pt-3 text-xs">
              <div className="flex justify-between text-modi-gray-900"><dt>جمع اقلام</dt><dd className="tabular-nums">{tomanShort(subtotal)}</dd></div>
              {tier.toman > 0 && <div className="flex justify-between text-modi-danger"><dt>{tier.label}</dt><dd className="tabular-nums">− {tomanShort(tier.toman)}</dd></div>}
              {disc > 0 && <div className="flex justify-between text-modi-danger"><dt>تخفیف دستی</dt><dd className="tabular-nums">− {tomanShort(disc)}</dd></div>}
              <div className="flex justify-between text-modi-gray-900"><dt>ارسال</dt><dd className="tabular-nums">{ship.label}</dd></div>
              <div className="flex justify-between text-sm font-bold"><dt>جمع کل</dt><dd className="tabular-nums">{tomanShort(total)}</dd></div>
            </dl>
            <button type="button" onClick={submit} disabled={pending} className={`${btnPrimary} mt-3 w-full`}>{pending ? "…" : "ثبت سفارش"}</button>
            <button type="button" onClick={() => router.push("/admin/orders")} className={`${btnSoft} mt-2 w-full`}>انصراف</button>
          </Card>
        </div>
      </div>
    </div>
  );
}
