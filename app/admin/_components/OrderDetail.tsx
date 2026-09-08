"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  formatJalali,
  formatQty,
  orderNumber,
  paymentMethodLabel,
  paymentStatusLabel,
  primaryAction,
  statusMeta,
  transitions,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { addOrderNoteAction, editOrderLinesAction, sendOrderSmsAction, setOrderStatusAction } from "@/lib/orderActions";
import { faNum, tomanShort } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import type { SmsTemplate } from "@/lib/siteContent";
import type { Product } from "@/lib/products";
import StatusPill, { PaymentStatusTag } from "./StatusPill";
import { btnDanger, btnPrimary, btnSoft, Card, ConfirmDialog, Field, inputCls, PageHeader, textareaCls } from "./ui";

const carriers = ["پست پیشتاز", "تیپاکس", "پیک تهران", "چاپار"];

export type PickableProduct = Pick<Product, "slug" | "name" | "image" | "unit" | "limit" | "meters">;
type EditLine = { slug: string; name: string; image: string; unit: string; qty: number; note: string; limit: number; stock: number };

/** Order detail — docs/admin-spec.md §4.2.2 / §4.2.3. */
export default function OrderDetail({ order, smsTemplates, storeName, products = [] }: { order: Order; smsTemplates: SmsTemplate[]; storeName: string; products?: PickableProduct[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [sms, setSms] = useState("");
  const [tracking, setTracking] = useState(order.delivery.type === "post" ? order.delivery.trackingCode ?? "" : "");
  const [carrier, setCarrier] = useState(order.delivery.type === "post" ? order.delivery.carrier : "");
  const [dialog, setDialog] = useState<null | "ship" | "cancel" | "return" | "back" | "lines">(null);
  const [reason, setReason] = useState("");
  const [backTo, setBackTo] = useState<OrderStatus>("paid");
  const [menu, setMenu] = useState(false);
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [addQ, setAddQ] = useState("");

  const action = primaryAction(order);
  const num = orderNumber(order.key);
  const canEditLines = ["pending_payment", "paid", "preparing"].includes(order.status);

  const openLinesEditor = () => {
    setEditLines(
      order.lines.map((l) => {
        const p = products.find((x) => x.slug === l.slug);
        // stock shown = what's free now + what this order already holds
        return { slug: l.slug, name: l.name, image: l.image, unit: l.unit, qty: l.qty, note: l.note ?? "", limit: p?.limit ?? 1, stock: (p?.meters ?? 0) + (order.status === "pending_payment" ? 0 : l.qty) };
      }),
    );
    setReason("");
    setAddQ("");
    setDialog("lines");
  };
  const addMatches = addQ.trim() ? products.filter((p) => !editLines.some((l) => l.slug === p.slug) && (p.name.includes(addQ) || p.slug.includes(addQ))).slice(0, 6) : [];
  const linesProblem = editLines.find((l) => l.qty < l.limit || l.qty > l.stock);
  const saveLines = () =>
    start(async () => {
      try {
        await editOrderLinesAction(order.key, editLines.map((l) => ({ slug: l.slug, qty: l.qty, note: l.note || undefined })), reason);
        toast("اقلام سفارش به‌روزرسانی شد");
        setDialog(null);
        setReason("");
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "انجام نشد");
      }
    });

  const move = (to: OrderStatus, opts?: { trackingCode?: string; carrier?: string; reason?: string; force?: boolean }) =>
    start(async () => {
      try {
        await setOrderStatusAction(order.key, to, opts);
        toast(`سفارش ${num}: ${statusMeta[to].label}`);
        setDialog(null);
        setReason("");
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "انجام نشد");
      }
    });

  const onPrimary = () => {
    if (!action) return;
    if (action.to === "shipped") return setDialog("ship");
    move(action.to);
  };

  const address =
    order.delivery.type === "post"
      ? `${order.delivery.recipient}\n${order.delivery.province}، ${order.delivery.city}\n${order.delivery.address}\nکد پستی ${order.delivery.postcode}\nموبایل ${order.delivery.mobile}${order.delivery.landline ? `\nثابت ${order.delivery.landline}` : ""}`
      : "";

  const fillTemplate = (t: SmsTemplate) =>
    setSms(
      t.text
        .replace("{order}", num)
        .replace("{carrier}", order.delivery.type === "post" ? order.delivery.carrier : "")
        .replace("{tracking}", order.delivery.type === "post" ? order.delivery.trackingCode ?? "…" : "")
        .replace("{day}", order.delivery.type === "pickup" ? order.delivery.day : "")
        .replace("{hour}", order.delivery.type === "pickup" ? order.delivery.hour : "")
        .replace("{amount}", order.total.toLocaleString("fa-IR"))
        .replace("{name}", order.customer.name)
        .replace("{link}", "modilish.com")
        .replace("{method}", "کیف پول"),
    );

  const canCancel = transitions[order.status].includes("cancelled");
  const canReturn = transitions[order.status].includes("returned");

  return (
    <div className="print:text-black">
      <PageHeader
        title={`سفارش ${num}`}
        subtitle={`${formatJalali(order.createdAt)} · ${order.source === "manual" ? "سفارش دستی" : "از سایت"} · ${paymentMethodLabel[order.paymentMethod]}${order.paymentRef ? ` · مرجع ${order.paymentRef}` : ""}`}
        back={{ href: "/admin/orders", label: "سفارش‌ها" }}
        actions={
          <>
            <span className="flex items-center gap-1">
              <StatusPill status={order.status} />
              <PaymentStatusTag paymentStatus={order.paymentStatus} />
            </span>
            {action && (
              <button type="button" onClick={onPrimary} disabled={pending} className={btnPrimary}>
                {pending ? "…" : action.label}
              </button>
            )}
            <div className="relative">
              <button type="button" aria-label="گزینه‌های بیشتر" onClick={() => setMenu((v) => !v)} className={`${btnSoft} w-10 px-0`}>⋯</button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute left-0 top-11 z-20 w-52 rounded-xl bg-white p-1 text-xs shadow-[0_8px_24px_-8px_rgba(43,39,64,0.4)]">
                    <Link href={`/admin/orders/${order.key}/print?type=packing`} target="_blank" onClick={() => setMenu(false)} className="block w-full rounded-lg px-3 py-2 text-start hover:bg-modi-purple-200">چاپ برگه بسته‌بندی (A5)</Link>
                    <Link href={`/admin/orders/${order.key}/print?type=invoice`} target="_blank" onClick={() => setMenu(false)} className="block w-full rounded-lg px-3 py-2 text-start hover:bg-modi-purple-200">چاپ فاکتور (A4)</Link>
                    {canEditLines && <button type="button" onClick={() => { setMenu(false); openLinesEditor(); }} className="block w-full rounded-lg px-3 py-2 text-start hover:bg-modi-purple-200">ویرایش اقلام</button>}
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast("لینک کپی شد"); setMenu(false); }} className="block w-full rounded-lg px-3 py-2 text-start hover:bg-modi-purple-200">کپی لینک</button>
                    {order.status !== "pending_payment" && order.status !== "cancelled" && (
                      <button type="button" onClick={() => { setMenu(false); setDialog("back"); }} className="block w-full rounded-lg px-3 py-2 text-start hover:bg-modi-purple-200">بازگشت به وضعیت قبل (مالک)</button>
                    )}
                    {canCancel && <button type="button" onClick={() => { setMenu(false); setDialog("cancel"); }} className="block w-full rounded-lg px-3 py-2 text-start text-modi-danger hover:bg-modi-danger-bg">لغو و بازپرداخت</button>}
                    {canReturn && <button type="button" onClick={() => { setMenu(false); setDialog("return"); }} className="block w-full rounded-lg px-3 py-2 text-start text-modi-danger hover:bg-modi-danger-bg">ثبت مرجوعی</button>}
                  </div>
                </>
              )}
            </div>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card title="اقلام" action={canEditLines ? <button type="button" onClick={openLinesEditor} className={`${btnSoft} h-8 text-xs`}>ویرایش اقلام</button> : undefined}>
            <ul className="divide-y divide-[#f3f0f7]">
              {order.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <Image src={l.image} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${l.slug}`} className="block truncate text-sm font-bold hover:text-modi-purple-800">{l.name}</Link>
                    <p className="text-xs text-modi-gray-900">
                      <span className="font-bold text-[#2b2740]">{formatQty(l)}</span> · {tomanShort(l.unitPrice)} / هر {l.unit}
                    </p>
                    {l.note && <p className="mt-1 inline-block rounded bg-modi-warning-bg px-2 py-0.5 text-[11px] text-modi-warning">«{l.note}»</p>}
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums">{tomanShort(l.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-[#f3f0f7] pt-3 text-sm">
              <div className="flex justify-between text-xs text-modi-gray-900"><dt>جمع اقلام</dt><dd className="tabular-nums">{tomanShort(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-xs text-modi-danger"><dt>تخفیف{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="tabular-nums">− {tomanShort(order.discount)}</dd></div>}
              <div className="flex justify-between text-xs text-modi-gray-900"><dt>هزینه ارسال</dt><dd className="tabular-nums">{order.shipping > 0 ? tomanShort(order.shipping) : "رایگان"}</dd></div>
              <div className="flex justify-between font-bold"><dt>جمع کل</dt><dd className="tabular-nums">{tomanShort(order.total)}</dd></div>
              <div className="flex justify-between text-xs text-modi-gray-900"><dt>پرداخت</dt><dd>{paymentStatusLabel[order.paymentStatus]} · {paymentMethodLabel[order.paymentMethod]}{order.paidAt ? ` · ${formatJalali(order.paidAt)}` : ""}</dd></div>
            </dl>
          </Card>

          <Card title="تحویل">
            {order.delivery.type === "post" ? (
              <div className="text-sm">
                <p className="mb-2 text-xs text-modi-gray-900">{order.delivery.carrier} · رایگان</p>
                <pre className="whitespace-pre-wrap rounded-xl bg-modi-gray-300 p-3 font-[inherit] text-sm leading-7">{address}</pre>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(address.replace(/\n/g, " — ")); toast("آدرس کپی شد"); }} className={`${btnSoft} h-9 text-xs`}>کپی آدرس</button>
                  {order.delivery.trackingCode ? (
                    <span className="text-xs">کد رهگیری: <span className="font-bold tabular-nums" dir="ltr">{order.delivery.trackingCode}</span></span>
                  ) : (
                    order.status === "preparing" && <button type="button" onClick={() => setDialog("ship")} className={`${btnPrimary} h-9 text-xs`}>ثبت کد رهگیری</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <p className="font-bold">دریافت حضوری — {order.delivery.day}، ساعت {order.delivery.hour}</p>
                <p className="mt-1 text-xs text-modi-gray-900">{order.delivery.cod ? "پرداخت در محل — هنگام تحویل، پرداخت را ثبت کنید" : "پرداخت آنلاین انجام شده"}</p>
                {order.status === "ready_for_pickup" && (
                  <button type="button" onClick={() => move("delivered")} disabled={pending} className={`${btnPrimary} mt-3 h-9 text-xs`}>
                    تحویل شد{order.delivery.cod ? " و پرداخت دریافت شد" : ""}
                  </button>
                )}
              </div>
            )}
          </Card>

          <Card title="مشتری">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex-1">
                <Link href={`/admin/customers/${order.customer.phone}`} className="font-bold hover:text-modi-purple-800">{order.customer.name}</Link>
                <p className="text-xs text-modi-gray-900 tabular-nums" dir="ltr">{order.customer.phone}</p>
                {order.customer.nationalCode && <p className="text-xs text-modi-gray-900">کد ملی {order.customer.nationalCode}</p>}
                {order.customer.referral && <p className="text-xs text-modi-gray-900">معرف: {order.customer.referral}</p>}
              </div>
              <a href={`tel:${order.customer.phone}`} className={`${btnSoft} h-9 text-xs`}>تماس</a>
              <Link href={`/admin/customers/${order.customer.phone}`} className={`${btnSoft} h-9 text-xs`}>صفحه مشتری</Link>
            </div>
            {order.customerNote && (
              <p className="mt-3 rounded-xl bg-modi-warning-bg px-3 py-2 text-xs leading-6 text-modi-warning">
                <span className="font-bold">توضیحات سفارش: </span>{order.customerNote}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="زمان‌بندی">
            <ol className="space-y-3">
              {[...order.events].reverse().map((e, i) => (
                <li key={i} className="grid grid-cols-[10px_1fr] gap-2 text-xs">
                  <span className={`mt-1.5 h-2 w-2 rounded-full ${e.type === "sms" ? "bg-modi-info" : e.type === "note" ? "bg-modi-warning" : "bg-modi-purple-800"}`} />
                  <span>
                    <span className="block leading-5">{e.text}</span>
                    <span className="block text-[11px] text-modi-gray-900">{formatJalali(e.at)} · {e.by}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="یادداشت داخلی">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="فقط کارکنان می‌بینند" className={`${textareaCls} min-h-16`} />
            <button
              type="button"
              disabled={pending || !note.trim()}
              onClick={() => start(async () => { await addOrderNoteAction(order.key, note); setNote(""); toast("یادداشت ثبت شد"); router.refresh(); })}
              className={`${btnSoft} mt-2 h-9 text-xs`}
            >
              افزودن به زمان‌بندی
            </button>
          </Card>

          <Card title="پیامک به مشتری">
            <div className="mb-2 flex flex-wrap gap-1">
              {smsTemplates.filter((t) => ["paid", "shipped", "ready_for_pickup", "delivered"].includes(t.event)).map((t) => (
                <button key={t.event} type="button" onClick={() => fillTemplate(t)} className="rounded-full bg-modi-gray-300 px-2.5 py-1 text-[11px] hover:bg-modi-purple-200">{t.label}</button>
              ))}
              <button type="button" onClick={() => setSms(`سلام ${order.customer.name} عزیز، لطفاً برای تایید آدرس سفارش ${num} با ما تماس بگیرید. ${storeName}`)} className="rounded-full bg-modi-gray-300 px-2.5 py-1 text-[11px] hover:bg-modi-purple-200">درخواست تایید آدرس</button>
              <button type="button" onClick={() => setSms(`سلام ${order.customer.name} عزیز، آماده‌سازی سفارش ${num} کمی بیشتر طول می‌کشد. از صبوری شما سپاسگزاریم. ${storeName}`)} className="rounded-full bg-modi-gray-300 px-2.5 py-1 text-[11px] hover:bg-modi-purple-200">عذرخواهی تاخیر</button>
            </div>
            <textarea value={sms} onChange={(e) => setSms(e.target.value)} className={`${textareaCls} min-h-16`} />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-modi-gray-900">{Math.max(1, Math.ceil(sms.length / 70)).toLocaleString("fa-IR")} بخش</span>
              <button
                type="button"
                disabled={pending || !sms.trim()}
                onClick={() => start(async () => { const r = await sendOrderSmsAction(order.key, sms); setSms(""); toast(r.status === "simulated" ? "ثبت شد — کاوه‌نگار متصل نیست، پیامک شبیه‌سازی شد" : "پیامک در صف ارسال قرار گرفت"); router.refresh(); })}
                className={`${btnPrimary} h-9 text-xs`}
              >
                ارسال
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* ship dialog */}
      {dialog === "ship" && (
        <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialog(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-t-3xl bg-white p-5 lg:rounded-2xl">
            <p className="text-sm font-bold">ثبت ارسال سفارش {num}</p>
            <Field label="شرکت حمل" className="mt-3">
              <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCls}>
                {[...new Set([carrier, ...carriers])].filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="کد رهگیری" required className="mt-3">
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} dir="ltr" className={`${inputCls} text-left`} autoFocus />
            </Field>
            <p className="mt-2 text-[11px] text-modi-gray-900">پیامک «ارسال شد» با کد رهگیری برای مشتری ثبت می‌شود.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={pending || !tracking.trim()} onClick={() => move("shipped", { trackingCode: tracking, carrier })} className={btnPrimary}>ثبت و ارسال شد</button>
              <button type="button" onClick={() => setDialog(null)} className={btnSoft}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      {(dialog === "cancel" || dialog === "return") && (
        <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialog(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-t-3xl bg-white p-5 lg:rounded-2xl">
            <p className="text-sm font-bold">{dialog === "cancel" ? `سفارش ${num} لغو شود؟` : `مرجوعی سفارش ${num}`}</p>
            <p className="mt-2 text-xs leading-6 text-modi-gray-900">
              {dialog === "cancel" ? "موجودی به انبار برمی‌گردد، مبلغ به کیف پول مشتری برگشت داده می‌شود و پیامک لغو ارسال می‌شود." : "موجودی به انبار برمی‌گردد و مبلغ بازپرداخت می‌شود."}
            </p>
            <Field label="دلیل" required className="mt-3">
              <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
                <option value="">انتخاب کنید…</option>
                {(dialog === "cancel" ? ["انصراف مشتری", "عدم موجودی", "عدم پاسخگویی مشتری", "خطای ثبت"] : ["ایراد پارچه", "کالای اشتباه", "متراژ اشتباه", "آسیب در حمل", "انصراف (برش‌نخورده)"]).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={pending || !reason} onClick={() => move(dialog === "cancel" ? "cancelled" : "returned", { reason })} className={btnDanger}>{dialog === "cancel" ? "لغو سفارش" : "ثبت مرجوعی"}</button>
              <button type="button" onClick={() => setDialog(null)} className={btnSoft}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      {dialog === "lines" && (
        <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialog(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-white p-5 lg:rounded-2xl">
            <p className="text-sm font-bold">ویرایش اقلام سفارش {num}</p>
            <p className="mt-1 text-[11px] leading-5 text-modi-gray-900">موجودی انبار به‌روزرسانی می‌شود؛ اگر مبلغ کم شود، مابه‌التفاوت به کیف پول مشتری برمی‌گردد و در زمان‌بندی ثبت می‌شود.</p>
            <ul className="mt-3 flex-1 space-y-2 overflow-y-auto">
              {editLines.map((l, i) => {
                const bad = l.qty < l.limit || l.qty > l.stock;
                return (
                  <li key={l.slug} className="flex flex-wrap items-center gap-2 rounded-xl bg-modi-gray-300 p-2">
                    <Image src={l.image} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1 truncate text-xs font-bold">{l.name}</span>
                    <span className="flex items-center gap-1 text-xs">
                      <input type="number" step={l.unit === "متر" ? 0.1 : 1} min={l.limit} max={l.stock} value={l.qty} onChange={(e) => setEditLines(editLines.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} className={`${inputCls} h-9 w-20 tabular-nums ${bad ? "ring-2 ring-modi-danger" : ""}`} />
                      {l.unit}
                    </span>
                    <input value={l.note} onChange={(e) => setEditLines(editLines.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder="توضیح برش" className={`${inputCls} h-9 w-36`} />
                    <button type="button" aria-label="حذف" onClick={() => setEditLines(editLines.filter((_, j) => j !== i))} className="h-8 w-8 rounded-lg bg-modi-danger-bg text-modi-danger">×</button>
                    <span className="w-full text-[10px] text-modi-gray-900">حداقل {faNum(l.limit)} · قابل تخصیص {faNum(l.stock)} {l.unit}</span>
                  </li>
                );
              })}
            </ul>
            <div className="relative mt-2">
              <input value={addQ} onChange={(e) => setAddQ(e.target.value)} placeholder="افزودن قلم — نام یا کد پارچه…" className={`${inputCls} h-9`} />
              {addMatches.length > 0 && (
                <ul className="absolute inset-x-0 top-10 z-10 rounded-xl bg-white p-1 shadow-[0_8px_24px_-8px_rgba(43,39,64,0.4)]">
                  {addMatches.map((p) => (
                    <li key={p.slug}>
                      <button type="button" onClick={() => { setEditLines([...editLines, { slug: p.slug, name: p.name, image: p.image, unit: p.unit, qty: p.limit, note: "", limit: p.limit, stock: p.meters }]); setAddQ(""); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-xs hover:bg-modi-purple-200">
                        <Image src={p.image} alt="" width={24} height={24} className="h-6 w-6 rounded object-cover" />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="tabular-nums text-modi-gray-900">{faNum(p.meters)} {p.unit}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Field label="دلیل ویرایش" required className="mt-3">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً درخواست مشتری / کمبود موجودی" className={inputCls} />
            </Field>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={pending || !reason.trim() || editLines.length === 0 || !!linesProblem} onClick={saveLines} className={btnPrimary}>ذخیره اقلام</button>
              <button type="button" onClick={() => setDialog(null)} className={btnSoft}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={dialog === "back"}
        title="بازگشت به وضعیت قبل"
        text="این کار فقط برای مالک است و با دلیل در زمان‌بندی ثبت می‌شود."
        confirmLabel="بازگردانی"
        onCancel={() => setDialog(null)}
        onConfirm={() => move(backTo, { force: true, reason: reason || "بازگشت به عقب توسط مالک" })}
      />
      {dialog === "back" && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-full max-w-sm px-4 lg:bottom-auto lg:top-1/2 lg:mt-24">
          <div className="rounded-2xl bg-white p-3 shadow-lg">
            <select value={backTo} onChange={(e) => setBackTo(e.target.value as OrderStatus)} className={inputCls}>
              {(["paid", "preparing", "shipped", "ready_for_pickup"] as OrderStatus[]).filter((s) => s !== order.status).map((s) => <option key={s} value={s}>{statusMeta[s].label}</option>)}
            </select>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل" className={`${inputCls} mt-2`} />
          </div>
        </div>
      )}
    </div>
  );
}
