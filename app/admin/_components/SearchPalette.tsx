"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { globalSearchAction, type SearchHit } from "@/lib/orderActions";
import AdminIcon from "../icons";

const groupLabel: Record<SearchHit["group"], string> = {
  orders: "سفارش‌ها",
  products: "محصولات",
  customers: "مشتریان",
  posts: "مجله",
  pages: "صفحات",
};

const quickLinks: SearchHit[] = [
  { group: "orders", title: "ثبت سفارش دستی", subtitle: "سفارش تلفنی / حضوری", href: "/admin/orders/new" },
  { group: "products", title: "افزودن پارچه", subtitle: "محصول جدید", href: "/admin/products/new" },
  { group: "products", title: "موجودی کم", subtitle: "محصولات زیر آستانه", href: "/admin/products?stock=low" },
  { group: "orders", title: "سفارش‌های پرداخت‌شده", subtitle: "در انتظار آماده‌سازی", href: "/admin/orders?status=paid" },
];

/** ⌘K / Ctrl K global search across orders, products, customers, posts and pages (§3.2). */
export default function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // debounced server search
  useEffect(() => {
    if (!open) return;
    const needle = q.trim();
    if (needle.length < 2) {
      const t = setTimeout(() => { setHits([]); setLoading(false); }, 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await globalSearchAction(needle);
      if (!cancelled) {
        setHits(r);
        setActive(0);
        setLoading(false);
      }
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  if (!open) return null;

  const list = q.trim().length < 2 ? quickLinks : hits;
  const go = (h: SearchHit) => {
    onClose();
    setQ("");
    router.push(h.href);
  };

  const grouped = list.reduce<{ group: SearchHit["group"]; items: { hit: SearchHit; index: number }[] }[]>((acc, hit, index) => {
    const g = acc.find((x) => x.group === hit.group);
    if (g) g.items.push({ hit, index });
    else acc.push({ group: hit.group, items: [{ hit, index }] });
    return acc;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[12vh]" role="dialog" aria-modal="true" aria-label="جستجوی سراسری">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_-12px_rgba(43,39,64,0.5)]">
        <div className="relative border-b border-[#ede9f2]">
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-modi-gray-900">
            <AdminIcon name="search" size={18} />
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(list.length - 1, a + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              if (e.key === "Enter" && list[active]) go(list[active]);
            }}
            placeholder="شماره سفارش، نام یا موبایل مشتری، نام یا کد پارچه، عنوان مطلب…"
            className="h-14 w-full bg-transparent pr-12 pl-4 text-sm outline-none placeholder:text-modi-gray-900"
          />
          {loading && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] text-modi-gray-900">در حال جستجو…</span>}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q.trim().length < 2 && <p className="px-3 py-1.5 text-[11px] font-bold text-modi-gray-900">دسترسی سریع</p>}
          {q.trim().length >= 2 && !loading && list.length === 0 && <p className="px-3 py-8 text-center text-xs text-modi-gray-900">چیزی پیدا نشد.</p>}
          {grouped.map((g) => (
            <div key={g.group} className="mb-1">
              {q.trim().length >= 2 && <p className="px-3 py-1.5 text-[11px] font-bold text-modi-gray-900">{groupLabel[g.group]}</p>}
              {g.items.map(({ hit, index }) => (
                <button
                  key={hit.href + hit.title}
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(hit)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start ${active === index ? "bg-modi-purple-800 text-white" : "hover:bg-modi-purple-200/60"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{hit.title}</span>
                    <span className={`block truncate text-[11px] ${active === index ? "text-white/80" : "text-modi-gray-900"}`}>{hit.subtitle}</span>
                  </span>
                  {active === index && <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">Enter</kbd>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-[#ede9f2] px-4 py-2 text-[10px] text-modi-gray-900">
          <span><kbd className="rounded border border-[#e4dfec] px-1">↑↓</kbd> حرکت</span>
          <span><kbd className="rounded border border-[#e4dfec] px-1">Enter</kbd> باز کردن</span>
          <span><kbd className="rounded border border-[#e4dfec] px-1">Esc</kbd> بستن</span>
        </div>
      </div>
    </div>
  );
}
