"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CustomerSummary } from "@/lib/orderStore";
import { faNum } from "@/lib/adminFormat";
import { EmptyState, inputCls } from "./ui";

type Row = CustomerSummary & { lastOrderLabel: string; totalLabel: string };
type Filter = "all" | "ordered" | "wallet" | "blocked";

export default function CustomersTable({ customers }: { customers: Row[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const list = useMemo(
    () =>
      customers.filter((c) => {
        if (filter === "ordered" && c.ordersCount === 0) return false;
        if (filter === "wallet" && c.meta.walletToman <= 0) return false;
        if (filter === "blocked" && !c.meta.blocked) return false;
        const needle = q.trim();
        return !needle || c.name.includes(needle) || c.phone.includes(needle) || c.city.includes(needle) || c.meta.tags.some((t) => t.includes(needle));
      }),
    [customers, q, filter],
  );

  const exportCsv = () => {
    const rows = [["نام", "موبایل", "شهر", "سفارش‌ها", "مجموع خرید", "برچسب‌ها"], ...list.map((c) => [c.name, c.phone, c.city, String(c.ordersCount), String(c.totalSpent), c.meta.tags.join(" ")])];
    const csv = "﻿" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "customers.csv";
    a.click();
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام، موبایل، شهر، برچسب…" className={`${inputCls} h-9 max-w-xs`} />
        {([["all", "همه"], ["ordered", "خرید کرده"], ["wallet", "دارای اعتبار کیف پول"], ["blocked", "مسدود"]] as [Filter, string][]).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === k ? "bg-modi-purple-800 text-white" : "bg-white"}`}>{l}</button>
        ))}
        <button type="button" onClick={exportCsv} className="ms-auto h-9 rounded-xl bg-modi-purple-200 px-3 text-xs font-bold text-modi-purple-800">خروجی CSV</button>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
        {list.length === 0 ? (
          <EmptyState text="مشتری‌ای با این مشخصات پیدا نشد" small />
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[#ede9f2] text-[11px] font-bold text-modi-gray-900">
                <th className="px-3 py-3 text-start">نام</th><th className="px-3 py-3 text-start">موبایل</th><th className="px-3 py-3 text-start">شهر</th><th className="px-3 py-3 text-start">سفارش‌ها</th><th className="px-3 py-3 text-start">مجموع خرید</th><th className="px-3 py-3 text-start">آخرین سفارش</th><th className="px-3 py-3 text-start">برچسب</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.phone} className="border-b border-[#f3f0f7] last:border-b-0 hover:bg-modi-purple-200/20">
                  <td className="px-3 py-2.5"><Link href={`/admin/customers/${c.phone}`} className="font-bold hover:text-modi-purple-800">{c.name}</Link>{c.meta.blocked && <span className="ms-1 rounded bg-modi-danger-bg px-1 text-[10px] text-modi-danger">مسدود</span>}</td>
                  <td className="px-3 py-2.5 tabular-nums text-modi-gray-900" dir="ltr">{c.phone}</td>
                  <td className="px-3 py-2.5 text-modi-gray-900">{c.city}</td>
                  <td className="px-3 py-2.5 tabular-nums">{faNum(c.ordersCount)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{c.totalLabel}</td>
                  <td className="px-3 py-2.5 text-xs text-modi-gray-900">{c.lastOrderLabel}</td>
                  <td className="px-3 py-2.5">{c.meta.tags.map((t) => <span key={t} className="me-1 rounded-full bg-modi-purple-200 px-2 py-0.5 text-[10px] text-modi-purple-800">{t}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
