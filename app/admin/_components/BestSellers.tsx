import Image from "next/image";
import Link from "next/link";
import type { ResolvedBestSeller } from "@/lib/adminData";
import { faNum, metersLabel, tomanShort } from "@/lib/adminFormat";

// "Best sellers this period — top 5 fabrics by metres sold, with stock
// remaining so a fast seller running low is obvious." — §4.1. Computed from
// the order lines in the period (lib/orderStore.ts).
export default function BestSellers({ items }: { items: ResolvedBestSeller[] }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:p-5">
      <p className="mb-2 text-sm font-bold">پرفروش‌ترین‌ها این دوره</p>
      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-modi-gray-900">در این بازه هنوز فروشی ثبت نشده است.</p>
      ) : (
        <div>
          {items.map((item, i) => (
            <Link
              key={item.slug}
              href={`/admin/products/${item.slug}`}
              className="flex items-center gap-3 border-t border-[#ede9f2] py-2.5 first:border-t-0 hover:bg-modi-purple-200/40"
            >
              <span className="w-4 shrink-0 text-xs font-bold text-modi-gray-900 tabular-nums">{faNum(i + 1)}</span>
              <Image src={item.product.image} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg border border-[#ede9f2] object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{item.product.name}</span>
                <span className="block text-[11px] text-modi-gray-900">
                  {item.product.unit === "متر" ? metersLabel(item.metersSold) : `${faNum(item.metersSold)} عدد`} فروخته‌شده · {tomanShort(item.product.price)}
                </span>
              </span>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold tabular-nums ${item.lowStock ? "bg-modi-warning-bg text-modi-warning" : item.stockRemaining <= 0 ? "bg-modi-danger-bg text-modi-danger" : "bg-modi-gray-500 text-modi-gray-900"}`}>
                {faNum(item.stockRemaining)} {item.product.unit} مانده
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
