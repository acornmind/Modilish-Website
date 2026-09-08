"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { orderNumber, statusMeta, type Order, type OrderStatus } from "@/lib/orders";
import { setOrderStatusAction } from "@/lib/orderActions";
import { toast } from "@/lib/toast";
import { faNum } from "@/lib/adminFormat";
import OrderRow from "./OrderRow";
import { btnPrimary, btnSoft, EmptyState, inputCls } from "./ui";

type TabKey = "all" | "pending_payment" | "paid" | "preparing" | "shipped" | "ready_for_pickup" | "delivered" | "closed";

const tabs: { key: TabKey; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "all", label: "همه", statuses: null },
  { key: "pending_payment", label: "در انتظار پرداخت", statuses: ["pending_payment", "failed"] },
  { key: "paid", label: "پرداخت‌شده", statuses: ["paid"] },
  { key: "preparing", label: "در حال آماده‌سازی", statuses: ["preparing"] },
  { key: "shipped", label: "ارسال‌شده", statuses: ["shipped"] },
  { key: "ready_for_pickup", label: "آماده تحویل", statuses: ["ready_for_pickup"] },
  { key: "delivered", label: "تحویل‌شده", statuses: ["delivered"] },
  { key: "closed", label: "لغو / مرجوع", statuses: ["cancelled", "returned"] },
];

/** Orders list — docs/admin-spec.md §4.2.1. Default tab «پرداخت‌شده» (the actionable queue). */
export default function OrdersList({ orders, initialTab }: { orders: Order[]; initialTab?: TabKey }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(initialTab ?? "paid");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<"all" | "post" | "pickup">("all");
  const [province, setProvince] = useState("all");
  const [noteOnly, setNoteOnly] = useState(false);
  const [sort, setSort] = useState<"newest" | "amount" | "slot">("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const provinces = useMemo(() => [...new Set(orders.filter((o) => o.delivery.type === "post").map((o) => (o.delivery.type === "post" ? o.delivery.province : "")))].filter(Boolean), [orders]);
  const count = (t: (typeof tabs)[number]) => (t.statuses ? orders.filter((o) => t.statuses!.includes(o.status)).length : orders.length);

  const list = useMemo(() => {
    const t = tabs.find((x) => x.key === tab)!;
    const needle = q.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    let out = orders.filter((o) => {
      if (t.statuses && !t.statuses.includes(o.status)) return false;
      if (method !== "all" && o.delivery.type !== method) return false;
      if (province !== "all" && !(o.delivery.type === "post" && o.delivery.province === province)) return false;
      if (noteOnly && !o.customerNote) return false;
      if (!needle) return true;
      const hay = [o.key, orderNumber(o.key), o.customer.name, o.customer.phone, o.delivery.type === "post" ? o.delivery.trackingCode ?? "" : ""].join(" ");
      return hay.includes(needle) || hay.includes(q.trim());
    });
    if (sort === "amount") out = [...out].sort((a, b) => b.total - a.total);
    if (sort === "slot") out = [...out].sort((a, b) => (a.delivery.type === "pickup" && b.delivery.type === "pickup" ? `${a.delivery.day}${a.delivery.hour}`.localeCompare(`${b.delivery.day}${b.delivery.hour}`) : 0));
    return out;
  }, [orders, tab, q, method, province, noteOnly, sort]);

  const bulk = (to: OrderStatus) =>
    start(async () => {
      let ok = 0;
      for (const key of selected) {
        try {
          await setOrderStatusAction(key, to);
          ok++;
        } catch {}
      }
      toast(`${faNum(ok)} سفارش → ${statusMeta[to].label}`);
      setSelected(new Set());
      router.refresh();
    });

  const exportCsv = () => {
    const rows = [["شماره", "تاریخ", "مشتری", "موبایل", "مبلغ", "وضعیت", "تحویل"], ...list.map((o) => [o.key, o.createdAt, o.customer.name, o.customer.phone, String(o.total), statusMeta[o.status].label, o.delivery.type])];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `orders-${tab}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex-1">
          <h1 className="text-base font-bold lg:text-lg">سفارش‌ها</h1>
          <p className="mt-0.5 text-xs text-modi-gray-900">{faNum(orders.length)} سفارش · سفارش‌های سایت و سفارش‌های دستی</p>
        </div>
        <Link href="/admin/orders/returns" className={btnSoft}>مرجوعی‌ها</Link>
        <Link href="/admin/orders/new" className={btnPrimary}>ثبت سفارش</Link>
      </div>

      <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${tab === t.key ? "bg-modi-purple-800 text-white" : "bg-white text-[#2b2740] hover:bg-modi-purple-200"}`}>
            {t.label}
            <span className={`rounded-full px-1.5 text-[10px] ${tab === t.key ? "bg-white/25" : "bg-modi-gray-500 text-modi-gray-900"}`}>{faNum(count(t))}</span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="شماره سفارش، نام، موبایل، کد رهگیری…" className={`${inputCls} h-9 max-w-xs`} />
        <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={`${inputCls} h-9 w-auto`}>
          <option value="all">همه روش‌ها</option>
          <option value="post">ارسال</option>
          <option value="pickup">حضوری</option>
        </select>
        <select value={province} onChange={(e) => setProvince(e.target.value)} className={`${inputCls} h-9 w-auto`}>
          <option value="all">همه استان‌ها</option>
          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="button" onClick={() => setNoteOnly((v) => !v)} className={`h-9 rounded-xl px-3 text-xs font-bold ${noteOnly ? "bg-modi-purple-800 text-white" : "bg-white"}`}>
          فقط دارای یادداشت مشتری
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={`${inputCls} h-9 w-auto`}>
          <option value="newest">جدیدترین</option>
          <option value="amount">بیشترین مبلغ</option>
          <option value="slot">به ترتیب ساعت تحویل</option>
        </select>
        <button type="button" onClick={exportCsv} className={`${btnSoft} h-9 text-xs`}>خروجی CSV</button>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#2b2740] px-3 py-2 text-xs text-white">
          <span>{faNum(selected.size)} سفارش انتخاب شد</span>
          <button type="button" disabled={pending} onClick={() => bulk("preparing")} className="rounded-lg bg-white/15 px-3 py-1.5 font-bold">شروع آماده‌سازی</button>
          <button type="button" disabled={pending} onClick={() => bulk("delivered")} className="rounded-lg bg-white/15 px-3 py-1.5 font-bold">تحویل شد</button>
          <button type="button" onClick={() => window.print()} className="rounded-lg bg-white/15 px-3 py-1.5 font-bold">چاپ برگه بسته‌بندی</button>
          <button type="button" onClick={() => setSelected(new Set())} className="ms-auto rounded-lg px-2 py-1.5">انصراف</button>
        </div>
      )}

      <div className="rounded-2xl bg-white p-3 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:p-4">
        {list.length === 0 ? (
          <EmptyState text="سفارشی در این وضعیت نیست" small />
        ) : (
          <>
            <div className="hidden gap-3 px-1 pb-2 text-[11px] font-bold text-modi-gray-900 lg:grid lg:grid-cols-[20px_1fr_1fr_1.2fr_1.3fr_.9fr_1.2fr_1fr_auto]">
              <input type="checkbox" aria-label="انتخاب همه" checked={list.every((o) => selected.has(o.key))} onChange={(e) => setSelected(e.target.checked ? new Set(list.map((o) => o.key)) : new Set())} className="h-4 w-4" />
              <span>شماره سفارش</span><span>تاریخ و ساعت</span><span>مشتری</span><span>اقلام</span><span>مبلغ</span><span>روش تحویل</span><span>وضعیت</span><span></span>
            </div>
            {list.map((o) => (
              <OrderRow
                key={o.key}
                order={o}
                selected={selected.has(o.key)}
                onSelect={(v) => setSelected((s) => { const n = new Set(s); if (v) n.add(o.key); else n.delete(o.key); return n; })}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
