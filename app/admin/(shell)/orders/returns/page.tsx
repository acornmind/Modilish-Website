import Link from "next/link";
import { getOrders } from "@/lib/orderStore";
import { formatJalali, orderNumber } from "@/lib/orders";
import { tomanShort, faNum } from "@/lib/adminFormat";
import { BackendNote, EmptyState } from "@/app/admin/_components/ui";

export const metadata = { title: "مرجوعی‌ها" };

// §4.2.6 — returns and cancellations with refunds. Customer-initiated return
// requests need the customer account (phase 1); staff-recorded ones from the
// order page land here.
export default function AdminReturnsPage() {
  const list = getOrders().filter((o) => o.status === "returned" || o.status === "cancelled");
  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/orders" className="text-xs text-modi-purple-800">سفارش‌ها</Link>
        <h1 className="text-base font-bold lg:text-lg">مرجوعی‌ها و لغوها</h1>
        <p className="mt-0.5 text-xs text-modi-gray-900">{faNum(list.length)} مورد · ثبت مرجوعی از صفحه هر سفارش (منوی ⋯) انجام می‌شود</p>
      </div>
      <BackendNote>
        سیاست: ایراد، کالای اشتباه، متراژ اشتباه یا آسیب در حمل → بازپرداخت کامل یا تعویض رایگان. انصراف فقط برای پارچه برش‌نخورده تا ۷ روز. بازپرداخت پیش‌فرض به کیف پول؛ بازپرداخت از درگاه پس از اتصال زرین‌پال فعال می‌شود.
      </BackendNote>
      <div className="mt-4 rounded-2xl bg-white p-3 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
        {list.length === 0 ? (
          <EmptyState text="درخواست مرجوعی یا لغوی ثبت نشده است" small />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-bold text-modi-gray-900">
                <th className="px-2 py-2 text-start">سفارش</th>
                <th className="px-2 py-2 text-start">مشتری</th>
                <th className="px-2 py-2 text-start">نوع</th>
                <th className="px-2 py-2 text-start">دلیل</th>
                <th className="px-2 py-2 text-start">مبلغ</th>
                <th className="px-2 py-2 text-start">بازپرداخت</th>
                <th className="px-2 py-2 text-start">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.key} className="border-t border-[#f3f0f7]">
                  <td className="px-2 py-2"><Link href={`/admin/orders/${o.key}`} className="font-bold tabular-nums text-modi-purple-800">{orderNumber(o.key)}</Link></td>
                  <td className="px-2 py-2">{o.customer.name}</td>
                  <td className="px-2 py-2">{o.status === "returned" ? "مرجوعی" : "لغو"}</td>
                  <td className="px-2 py-2 text-xs text-modi-gray-900">{o.cancelReason ?? "—"}</td>
                  <td className="px-2 py-2 tabular-nums">{tomanShort(o.total)}</td>
                  <td className="px-2 py-2 text-xs">{o.paymentStatus === "refunded" ? "به کیف پول" : "بدون پرداخت"}</td>
                  <td className="px-2 py-2 text-xs text-modi-gray-900 tabular-nums">{formatJalali(o.events[o.events.length - 1]?.at ?? o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
