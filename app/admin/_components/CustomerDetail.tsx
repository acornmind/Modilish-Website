"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Order } from "@/lib/orders";
import type { CustomerMeta } from "@/lib/orderStore";
import { saveCustomerMetaAction, sendSmsAction } from "@/lib/orderActions";
import { faNum, tomanShort } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import OrderRow from "./OrderRow";
import { btnDanger, btnPrimary, btnSoft, Card, ConfirmDialog, Field, inputCls, PageHeader, textareaCls } from "./ui";

/** Customer detail — docs/admin-spec.md §4.9. */
export default function CustomerDetail({ phone, name, orders, meta: initial }: { phone: string; name: string; orders: Order[]; meta: CustomerMeta }) {
  const router = useRouter();
  const [meta, setMeta] = useState(initial);
  const [note, setNote] = useState("");
  const [tag, setTag] = useState("");
  const [sms, setSms] = useState("");
  const [walletDelta, setWalletDelta] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [pending, start] = useTransition();

  const counted = orders.filter((o) => !["cancelled", "failed", "pending_payment"].includes(o.status));
  const total = counted.reduce((s, o) => s + o.total, 0);
  const addresses = [...new Map(orders.filter((o) => o.delivery.type === "post").map((o) => o.delivery.type === "post" ? [`${o.delivery.province}|${o.delivery.city}|${o.delivery.address}`, o.delivery] : ["", null])).values()].filter(Boolean);

  const persist = (next: CustomerMeta, msg = "ذخیره شد") =>
    start(async () => {
      await saveCustomerMetaAction(phone, next);
      setMeta(next);
      toast(msg);
      router.refresh();
    });

  return (
    <div>
      <PageHeader
        title={name}
        subtitle={`${phone} · ${faNum(counted.length)} سفارش · ${tomanShort(total)} · کد معرف MD${phone.slice(-5)}`}
        back={{ href: "/admin/customers", label: "مشتریان" }}
        actions={
          <>
            <a href={`tel:${phone}`} className={btnSoft}>تماس</a>
            <Link href={`/admin/orders/new?phone=${phone}`} className={btnSoft}>ثبت سفارش</Link>
            <button type="button" onClick={() => setConfirmBlock(true)} className={meta.blocked ? btnSoft : btnDanger}>{meta.blocked ? "رفع مسدودی" : "مسدودکردن"}</button>
          </>
        }
      />
      {meta.blocked && <p className="mb-3 rounded-xl bg-modi-danger-bg px-3 py-2 text-xs font-bold text-modi-danger">این مشتری مسدود است — امکان ثبت سفارش ندارد.</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card title="سفارش‌ها">
            {orders.map((o) => <OrderRow key={o.key} order={o} />)}
          </Card>
          <Card title="آدرس‌ها">
            {addresses.length === 0 ? (
              <p className="text-xs text-modi-gray-900">فقط تحویل حضوری داشته است.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {addresses.map((a, i) => a && a.type === "post" && (
                  <li key={i} className="rounded-xl bg-modi-gray-300 p-3 leading-6">
                    <span className="font-bold">{a.recipient}</span> · {a.province}، {a.city}، {a.address} · کد پستی {a.postcode}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="برچسب‌ها">
            <div className="mb-2 flex flex-wrap gap-1">
              {meta.tags.map((t) => (
                <button key={t} type="button" onClick={() => persist({ ...meta, tags: meta.tags.filter((x) => x !== t) })} className="rounded-full bg-modi-purple-200 px-2.5 py-1 text-[11px] text-modi-purple-800" title="حذف">{t} ×</button>
              ))}
              {["خیاط", "عمده", "VIP"].filter((t) => !meta.tags.includes(t)).map((t) => (
                <button key={t} type="button" onClick={() => persist({ ...meta, tags: [...meta.tags, t] })} className="rounded-full bg-modi-gray-300 px-2.5 py-1 text-[11px]">+ {t}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="برچسب دلخواه" className={`${inputCls} h-9`} />
              <button type="button" disabled={!tag.trim() || pending} onClick={() => { persist({ ...meta, tags: [...new Set([...meta.tags, tag.trim()])] }); setTag(""); }} className={`${btnSoft} h-9 text-xs`}>افزودن</button>
            </div>
          </Card>
          <Card title={`کیف پول · ${tomanShort(meta.walletToman)}`}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="مبلغ (± تومان)"><input value={walletDelta} onChange={(e) => setWalletDelta(e.target.value)} inputMode="numeric" placeholder="مثلاً 200000 یا -50000" dir="ltr" className={`${inputCls} text-left tabular-nums`} /></Field>
              <Field label="دلیل"><input value={walletReason} onChange={(e) => setWalletReason(e.target.value)} className={inputCls} /></Field>
            </div>
            <button
              type="button"
              disabled={pending || !Number(walletDelta) || !walletReason.trim()}
              onClick={() => {
                const next = { ...meta, walletToman: Math.max(0, meta.walletToman + Number(walletDelta)), notes: [...meta.notes, `کیف پول ${Number(walletDelta) > 0 ? "+" : ""}${Number(walletDelta).toLocaleString("fa-IR")} — ${walletReason}`] };
                persist(next, "اعتبار ثبت شد");
                setWalletDelta("");
                setWalletReason("");
              }}
              className={`${btnPrimary} mt-2 h-9 text-xs`}
            >
              ثبت تغییر اعتبار
            </button>
          </Card>
          <Card title="یادداشت‌ها">
            <ul className="mb-2 space-y-1 text-xs">
              {meta.notes.map((n, i) => <li key={i} className="rounded-lg bg-modi-gray-300 px-3 py-2 leading-6">{n}</li>)}
            </ul>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className={`${textareaCls} min-h-14`} />
            <button type="button" disabled={pending || !note.trim()} onClick={() => { persist({ ...meta, notes: [...meta.notes, note.trim()] }); setNote(""); }} className={`${btnSoft} mt-2 h-9 text-xs`}>افزودن یادداشت</button>
          </Card>
          <Card title="پیامک">
            <textarea value={sms} onChange={(e) => setSms(e.target.value)} placeholder={`سلام ${name} عزیز…`} className={`${textareaCls} min-h-14`} />
            <button type="button" disabled={pending || !sms.trim()} onClick={() => start(async () => { const r = await sendSmsAction([phone], sms, "single"); setSms(""); toast(r.status === "simulated" ? "ثبت شد — کاوه‌نگار متصل نیست" : "در صف ارسال"); })} className={`${btnPrimary} mt-2 h-9 text-xs`}>ارسال</button>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirmBlock}
        title={meta.blocked ? "رفع مسدودی مشتری" : `${name} مسدود شود؟`}
        text={meta.blocked ? "" : "مشتری با پیام مودبانه از ثبت سفارش منع می‌شود."}
        danger={!meta.blocked}
        confirmLabel={meta.blocked ? "رفع مسدودی" : "مسدود کن"}
        onCancel={() => setConfirmBlock(false)}
        onConfirm={() => { persist({ ...meta, blocked: !meta.blocked }); setConfirmBlock(false); }}
      />
    </div>
  );
}
