import Link from "next/link";
import type { Attention } from "@/lib/adminMock";
import { faNum } from "@/lib/adminFormat";

// "چه چیزی منتظر من است؟" strip — docs/admin-spec.md §4.1. Only rendered
// when at least one item is non-zero; each item is itself conditional.
export default function NeedsAttention({ attention: a }: { attention: Attention }) {
  const items: { key: string; href: string; text: string; tone: "purple" | "warn" | "danger" }[] = [];

  if (a.paidAwaitingPrep > 0) {
    items.push({ key: "paid", href: "/admin/orders?status=paid", text: `${faNum(a.paidAwaitingPrep)} سفارش پرداخت‌شده در انتظار آماده‌سازی`, tone: "purple" });
  }
  if (a.readyForPickupToday > 0) {
    items.push({ key: "pickup", href: "/admin/orders?status=ready_for_pickup", text: `${faNum(a.readyForPickupToday)} سفارش آماده تحویل حضوری امروز`, tone: "purple" });
  }
  if (a.lowStockCount > 0) {
    items.push({ key: "stock", href: "/admin/products?stock=low", text: `${faNum(a.lowStockCount)} پارچه با موجودی کم`, tone: "warn" });
  }
  if (a.pendingReviews > 0) {
    items.push({ key: "reviews", href: "/admin/reviews", text: `${faNum(a.pendingReviews)} دیدگاه در انتظار تایید`, tone: "purple" });
  }
  if (a.newMessages > 0) {
    items.push({ key: "messages", href: "/admin/reviews?tab=messages", text: `${faNum(a.newMessages)} پیام تماس خوانده‌نشده`, tone: "purple" });
  }
  if (!a.gatewayHealthy || !a.smsHealthy) {
    items.push({ key: "health", href: "/admin/settings/integrations", text: "درگاه پرداخت / پیامک متصل نیست", tone: "danger" });
  }

  if (items.length === 0) return null;

  const toneClass = {
    purple: "bg-modi-purple-200 text-modi-purple-800",
    warn: "bg-modi-warning-bg text-modi-warning",
    danger: "bg-modi-danger-bg text-modi-danger",
  };

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link key={item.key} href={item.href} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${toneClass[item.tone]}`}>
          {item.text}
        </Link>
      ))}
    </div>
  );
}
