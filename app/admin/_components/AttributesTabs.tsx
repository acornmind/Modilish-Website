"use client";

import Link from "next/link";
import { useState } from "react";
import { faNum } from "@/lib/adminFormat";
import AdminIcon from "../icons";
import { Card, inputCls, Tabs } from "./ui";

type Value = { name: string; count: number; href: string; editHref: string; hidden?: boolean; hasMeta?: boolean };
type Tab = { key: string; label: string; values: Value[] };

export default function AttributesTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const [q, setQ] = useState("");
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  const values = tab.values.filter((v) => !q || v.name.includes(q));
  const max = Math.max(1, ...tab.values.map((v) => v.count));

  return (
    <div>
      <Tabs tabs={tabs.map((t) => ({ key: t.key, label: t.label, count: t.values.length }))} value={active} onChange={setActive} />
      <Card
        title={`${tab.label} · ${faNum(tab.values.length)} مقدار`}
        action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…" className={`${inputCls} h-9 max-w-[200px]`} />}
      >
        <ul className="divide-y divide-[#f3f0f7]">
          {values.map((v, i) => (
            <li key={v.name} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-6 shrink-0 text-xs text-modi-gray-900 tabular-nums">{faNum(i + 1)}</span>
              <Link href={v.editHref} className="min-w-0 flex-1 rounded-lg hover:text-modi-purple-800">
                <span className="flex items-center gap-1.5 truncate font-bold">
                  {v.name}
                  {v.hidden && <span className="rounded-full bg-modi-gray-500 px-1.5 text-[10px] font-normal text-modi-gray-900">پنهان در منو</span>}
                  {v.hasMeta && <span className="rounded-full bg-modi-purple-200 px-1.5 text-[10px] font-normal text-modi-purple-800">متن صفحه</span>}
                </span>
                <span className="mt-1 block h-1 rounded-full bg-modi-gray-500">
                  <span className="block h-1 rounded-full bg-modi-purple-500" style={{ width: `${Math.round((v.count / max) * 100)}%` }} />
                </span>
              </Link>
              <span className="shrink-0 text-xs text-modi-gray-900 tabular-nums">{faNum(v.count)} محصول</span>
              <Link href={v.editHref} className="shrink-0 rounded-lg bg-modi-purple-200 px-2.5 py-1 text-[11px] font-bold text-modi-purple-800">ویرایش</Link>
              <Link href={`/admin/products?q=${encodeURIComponent(v.name)}`} className="shrink-0 rounded-lg bg-modi-gray-300 px-2.5 py-1 text-[11px] font-bold">محصولات</Link>
              <Link href={v.href} target="_blank" aria-label="مشاهده در سایت" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-modi-gray-900 hover:bg-modi-gray-500">
                <AdminIcon name="external" size={14} />
              </Link>
            </li>
          ))}
          {values.length === 0 && <li className="py-8 text-center text-xs text-modi-gray-900">مقداری پیدا نشد.</li>}
        </ul>
      </Card>
    </div>
  );
}
