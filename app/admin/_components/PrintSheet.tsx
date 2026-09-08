import Link from "next/link";
import { formatJalali, formatQty, orderNumber, paymentMethodLabel, paymentStatusLabel, type Order } from "@/lib/orders";
import type { SiteSettings } from "@/lib/siteContent";
import PrintButton from "./PrintButton";

const fa = (n: number) => n.toLocaleString("fa-IR");

/* Code 39 — digits and "-" are all an order number needs. n = narrow, w = wide; bars/spaces alternate starting with a bar. */
const code39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn", "-": "nwnnnnwnw", "*": "nwnnwnwnn",
};
function Barcode({ text, height = 38 }: { text: string; height?: number }) {
  const chars = `*${text.replace(/[^0-9-]/g, "")}*`.split("");
  const rects: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of chars) {
    const pat = code39[ch] ?? code39["-"];
    pat.split("").forEach((el, i) => {
      const w = el === "w" ? 3 : 1;
      if (i % 2 === 0) rects.push({ x, w });
      x += w;
    });
    x += 1; // inter-character gap
  }
  return (
    <svg viewBox={`0 0 ${x} ${height}`} width={x * 1.6} height={height} aria-label={text} className="max-w-full">
      {rects.map((r, i) => <rect key={i} x={r.x} y={0} width={r.w} height={height} fill="#000" />)}
    </svg>
  );
}

/** A5 packing slip (cuts + address + barcode) or A4 invoice (legal name, VAT) — §4.2.4. */
export default function PrintSheet({ order, type, store, vatPercent }: { order: Order; type: "packing" | "invoice"; store: SiteSettings["store"]; vatPercent: number }) {
  const num = orderNumber(order.key);
  const invoice = type === "invoice";
  const vat = vatPercent > 0 ? Math.round(order.total - order.total / (1 + vatPercent / 100)) : 0;
  const address =
    order.delivery.type === "post"
      ? [order.delivery.recipient, `${order.delivery.province}، ${order.delivery.city}`, order.delivery.address, `کد پستی ${order.delivery.postcode}`, `موبایل ${order.delivery.mobile}${order.delivery.landline ? ` · ثابت ${order.delivery.landline}` : ""}`]
      : [`دریافت حضوری — ${order.delivery.day}، ساعت ${order.delivery.hour}`, order.delivery.cod ? "پرداخت در محل" : "پرداخت‌شده"];

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f4f8] print:bg-white">
      <style>{`@page { size: ${invoice ? "A4" : "A5"}; margin: 10mm; } @media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div className="no-print sticky top-0 z-10 flex items-center gap-2 border-b border-[#e4dfec] bg-white px-4 py-3 text-sm">
        <Link href={`/admin/orders/${order.key}`} className="text-modi-purple-800">← سفارش {num}</Link>
        <span className="text-modi-gray-900">·</span>
        <Link href={`/admin/orders/${order.key}/print?type=packing`} className={`rounded-full px-3 py-1 text-xs font-bold ${!invoice ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}>برگه بسته‌بندی (A5)</Link>
        <Link href={`/admin/orders/${order.key}/print?type=invoice`} className={`rounded-full px-3 py-1 text-xs font-bold ${invoice ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}>فاکتور (A4)</Link>
        <span className="ms-auto"><PrintButton /></span>
      </div>

      <div className={`mx-auto my-6 bg-white p-8 text-[13px] leading-6 text-black shadow-md print:my-0 print:shadow-none ${invoice ? "max-w-[210mm]" : "max-w-[148mm]"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-black pb-3">
          <div>
            <p className="text-lg font-bold">{invoice ? store.legalName || store.name : store.name}</p>
            {invoice && <p className="text-xs">{store.address}</p>}
            <p className="text-xs">{store.phone}{store.email && ` · ${store.email}`}</p>
          </div>
          <div className="text-end">
            <p className="text-base font-bold">{invoice ? "فاکتور فروش" : "برگه بسته‌بندی"}</p>
            <p className="text-xs">شماره سفارش <span className="font-bold tabular-nums">{num}</span></p>
            <p className="text-xs">{formatJalali(order.createdAt)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-xs font-bold">{invoice ? "خریدار" : "گیرنده"}</p>
            <p className="font-bold">{order.customer.name}</p>
            <p dir="ltr" className="text-start text-xs tabular-nums">{order.customer.phone}</p>
            {invoice && order.customer.nationalCode && <p className="text-xs">کد ملی {order.customer.nationalCode}</p>}
            {/* recipient name is already the heading; print the rest of the address block */}
            {address.slice(order.delivery.type === "post" ? 1 : 0).map((l, i) => <p key={i} className="text-xs">{l}</p>)}
          </div>
          <div className="flex flex-col items-end justify-between">
            <Barcode text={order.key} />
            {!invoice && order.delivery.type === "post" && <p className="text-xs">{order.delivery.carrier}{order.delivery.trackingCode && <> · رهگیری <span dir="ltr" className="tabular-nums">{order.delivery.trackingCode}</span></>}</p>}
            {invoice && <p className="text-xs">{paymentMethodLabel[order.paymentMethod]} · {paymentStatusLabel[order.paymentStatus]}</p>}
          </div>
        </div>

        <table className="mt-5 w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-black">
              <th className="py-1.5 text-start">#</th>
              <th className="py-1.5 text-start">شرح</th>
              <th className="py-1.5 text-start">مقدار</th>
              {invoice && <th className="py-1.5 text-start">فی (تومان)</th>}
              {invoice && <th className="py-1.5 text-end">مبلغ (تومان)</th>}
              {!invoice && <th className="py-1.5 text-center">برش شد</th>}
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l, i) => (
              <tr key={i} className="border-b border-dashed border-gray-400">
                <td className="py-2 tabular-nums">{fa(i + 1)}</td>
                <td className="py-2">
                  <span className="font-bold">{l.name}</span> <span className="text-gray-600">({l.slug})</span>
                  {l.note && <span className="block text-[11px]">«{l.note}»</span>}
                </td>
                <td className="py-2 font-bold tabular-nums">{formatQty(l)}</td>
                {invoice && <td className="py-2 tabular-nums">{fa(l.unitPrice)}</td>}
                {invoice && <td className="py-2 text-end tabular-nums">{fa(l.lineTotal)}</td>}
                {!invoice && <td className="py-2 text-center"><span className="inline-block h-4 w-4 border border-black" /></td>}
              </tr>
            ))}
          </tbody>
        </table>

        {invoice ? (
          <div className="mt-4 flex justify-end">
            <dl className="w-64 space-y-1 text-xs">
              <div className="flex justify-between"><dt>جمع اقلام</dt><dd className="tabular-nums">{fa(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt>تخفیف{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="tabular-nums">− {fa(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt>هزینه ارسال</dt><dd className="tabular-nums">{order.shipping > 0 ? fa(order.shipping) : "رایگان"}</dd></div>
              {vat > 0 && <div className="flex justify-between text-gray-600"><dt>شامل مالیات بر ارزش افزوده ({fa(vatPercent)}٪)</dt><dd className="tabular-nums">{fa(vat)}</dd></div>}
              <div className="flex justify-between border-t border-black pt-1 text-sm font-bold"><dt>مبلغ کل</dt><dd className="tabular-nums">{fa(order.total)} تومان</dd></div>
            </dl>
          </div>
        ) : (
          <div className="mt-4 text-xs">
            <p>{fa(order.lines.length)} قلم · {order.customerNote ? <>توضیح مشتری: <b>{order.customerNote}</b></> : "بدون توضیح مشتری"}</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <p className="border-t border-black pt-1">برش و بسته‌بندی: ............</p>
              <p className="border-t border-black pt-1">کنترل نهایی: ............</p>
            </div>
          </div>
        )}

        {invoice && (
          <p className="mt-8 text-[11px] text-gray-600">این فاکتور با شماره سفارش {num} در {store.name} صادر شده است.{vatPercent > 0 ? " قیمت‌ها شامل مالیات بر ارزش افزوده است." : ""}</p>
        )}
      </div>
    </div>
  );
}
