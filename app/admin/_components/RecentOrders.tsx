import Link from "next/link";
import type { Order } from "@/lib/orders";
import OrderRow from "./OrderRow";

// "Recent orders — last 10, same row component as the orders list" — §4.1.
export default function RecentOrders({ orders }: { orders: Order[] }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">آخرین سفارش‌ها</p>
        <Link href="/admin/orders" className="text-xs text-modi-purple-800">همه سفارش‌ها</Link>
      </div>
      {orders.length === 0 ? (
        <p className="py-8 text-center text-xs text-modi-gray-900">هنوز سفارشی ثبت نشده است.</p>
      ) : (
        <>
          <div className="hidden gap-3 px-1 pb-2 text-[11px] font-bold text-modi-gray-900 lg:grid lg:grid-cols-[1fr_1fr_1.2fr_1.3fr_.9fr_1.2fr_1fr_auto]">
            <span>شماره سفارش</span>
            <span>تاریخ و ساعت</span>
            <span>مشتری</span>
            <span>اقلام</span>
            <span>مبلغ</span>
            <span>روش تحویل</span>
            <span>وضعیت</span>
            <span></span>
          </div>
          <div>
            {orders.slice(0, 10).map((order) => (
              <OrderRow key={order.key} order={order} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
