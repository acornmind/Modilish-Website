"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { categories, type Product } from "@/lib/products";
import { updateProductAction } from "@/lib/productActions";
import { LOW_STOCK_THRESHOLD_METERS } from "@/lib/constants";
import { faNum } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import AdminIcon from "../icons";
import { btnPrimary, btnSoft, inputCls } from "./ui";

function stockStatus(p: Product) {
  if (p.status === "draft") return { label: "پیش‌نویس", cls: "bg-modi-gray-500 text-modi-gray-900" };
  if (p.status === "hidden") return { label: "پنهان", cls: "bg-modi-gray-500 text-modi-gray-900" };
  if (p.meters <= 0) return { label: "ناموجود", cls: "bg-modi-danger-bg text-modi-danger" };
  if (p.meters <= LOW_STOCK_THRESHOLD_METERS)
    return { label: "موجودی کم", cls: "bg-modi-warning-bg text-modi-warning" };
  return { label: "موجود", cls: "bg-modi-success-bg text-modi-success" };
}

/** Inline-editable number cell — "click a cell, type, Enter" (§4.3.1). */
function EditableNumber({
  value,
  suffix,
  onSave,
}: {
  value: number;
  suffix: string;
  onSave: (next: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(String(value));
          setEditing(true);
        }}
        className="rounded-lg px-2 py-1 text-start tabular-nums hover:bg-modi-purple-200"
        title="برای ویرایش کلیک کنید"
      >
        {faNum(value)} {suffix}
      </button>
    );
  }

  function commit() {
    const next = Number(draft.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d.-]/g, ""));
    setEditing(false);
    if (!Number.isFinite(next) || next < 0 || next === value) return;
    onSave(next);
  }

  return (
    <input
      autoFocus
      type="text"
      inputMode="decimal"
      value={draft}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-24 rounded-lg border border-modi-purple-500 bg-white px-2 py-1 text-start tabular-nums outline-none"
    />
  );
}

type Filter = "all" | "low" | "out" | "sale" | "draft" | "nophoto";

export default function ProductsTable({
  products,
  initialFilter,
  initialQuery = "",
}: {
  products: Product[];
  initialFilter?: Filter;
  initialQuery?: string;
}) {
  const [list, setList] = useState(products);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>(initialFilter ?? "all");
  const [material, setMaterial] = useState("همه");
  const [view, setView] = useState<"table" | "grid">("table");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim();
    return list.filter((p) => {
      if (material !== "همه" && p.category !== material) return false;
      if (filter === "low" && !(p.meters > 0 && p.meters <= LOW_STOCK_THRESHOLD_METERS)) return false;
      if (filter === "out" && p.meters > 0) return false;
      if (filter === "sale" && !(p.salePrice > 0)) return false;
      if (filter === "draft" && p.status !== "draft" && p.status !== "hidden") return false;
      if (filter === "nophoto" && p.image !== "/img/box.png") return false;
      if (!q) return true;
      return p.name.includes(q) || p.slug.includes(q) || p.category.includes(q) || p.attributes.some((a) => a.value.includes(q));
    });
  }, [list, query, filter, material]);

  function save(slug: string, patch: Partial<Pick<Product, "price" | "meters">>) {
    setList((prev) => prev.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));
    startTransition(async () => {
      try {
        await updateProductAction(slug, patch);
        toast("ذخیره شد");
      } catch {
        toast("ذخیره نشد — دوباره تلاش کنید");
      }
    });
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "همه" },
    { key: "low", label: "موجودی کم" },
    { key: "out", label: "ناموجود" },
    { key: "sale", label: "تخفیف‌دار" },
    { key: "draft", label: "پیش‌نویس / پنهان" },
    { key: "nophoto", label: "بدون عکس" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو در نام، کد، جنس، رنگ…"
          className={`${inputCls} max-w-xs`}
        />
        <select value={material} onChange={(e) => setMaterial(e.target.value)} className={`${inputCls} w-auto`}>
          {categories.map((c) => (
            <option key={c} value={c}>{c === "همه" ? "همه جنس‌ها" : c}</option>
          ))}
        </select>
        <span className="text-xs text-modi-gray-900">
          {faNum(filtered.length)} از {faNum(list.length)} محصول
        </span>
        <div className="ms-auto flex items-center gap-2">
          <div className="flex rounded-xl bg-white p-0.5">
            {(["table", "grid"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`h-9 rounded-lg px-3 text-xs font-bold ${view === v ? "bg-modi-purple-800 text-white" : "text-modi-gray-900"}`}
              >
                {v === "table" ? "جدول" : "شبکه"}
              </button>
            ))}
          </div>
          <a href="/api/admin/export?type=products" download className={`${btnSoft} h-10 text-xs`} title="CSV همه محصولات — قابل ویرایش در اکسل و درون‌ریزی دوباره">
            برون‌ریزی
          </a>
          <Link href="/admin/products/import" className={`${btnSoft} h-10 text-xs`}>
            درون‌ریزی
          </Link>
          <Link href="/admin/products/new" className={btnPrimary}>
            افزودن پارچه
          </Link>
        </div>
      </div>

      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ${filter === f.key ? "bg-modi-purple-800 text-white" : "bg-white text-[#2b2740] hover:bg-modi-purple-200"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {filtered.map((p) => {
            const status = stockStatus(p);
            return (
              <Link key={p.slug} href={`/admin/products/${p.slug}`} className="rounded-2xl bg-white p-2.5 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] hover:-translate-y-0.5">
                <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-modi-gray-300">
                  <Image src={p.image} alt="" fill sizes="200px" className="object-cover" />
                </span>
                <p className="mt-2 truncate text-xs font-bold">{p.name}</p>
                <p className="mt-1 flex items-center justify-between text-[11px] text-modi-gray-900">
                  <span className="tabular-nums">{faNum(p.salePrice > 0 ? p.salePrice : p.price)} تومان</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold ${status.cls}`}>{status.label}</span>
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#ede9f2] text-[11px] font-bold text-modi-gray-900">
                <th className="px-3 py-3 text-start">محصول</th>
                <th className="px-3 py-3 text-start">کد</th>
                <th className="px-3 py-3 text-start">جنس</th>
                <th className="px-3 py-3 text-start">قیمت</th>
                <th className="px-3 py-3 text-start">موجودی</th>
                <th className="px-3 py-3 text-start">وضعیت</th>
                <th className="px-3 py-3 text-start"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = stockStatus(p);
                return (
                  <tr key={p.slug} className="border-b border-[#f3f0f7] last:border-b-0 hover:bg-modi-purple-200/20">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/products/${p.slug}`} className="flex items-center gap-2.5">
                        <Image src={p.image} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg border border-[#ede9f2] object-cover" />
                        <span className="max-w-[220px] truncate font-bold">{p.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-modi-gray-900">{p.slug}</td>
                    <td className="px-3 py-2.5 text-modi-gray-900">{p.category}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <EditableNumber value={p.price} suffix="تومان" onSave={(next) => save(p.slug, { price: next })} />
                        {p.salePrice > 0 && <span className="px-2 text-[11px] text-modi-danger tabular-nums">ویژه: {faNum(p.salePrice)}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <EditableNumber value={p.meters} suffix={p.unit} onSave={(next) => save(p.slug, { meters: next })} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1">
                        <Link href={`/admin/products/${p.slug}`} className={`${btnSoft} h-8 px-3 text-xs`}>
                          ویرایش
                        </Link>
                        <Link href={`/product/${p.slug}?preview=1`} target="_blank" aria-label="مشاهده در سایت" className="flex h-8 w-8 items-center justify-center rounded-lg text-modi-gray-900 hover:bg-modi-gray-500">
                          <AdminIcon name="external" size={14} />
                        </Link>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-modi-gray-900">
                    محصولی با این مشخصات پیدا نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
