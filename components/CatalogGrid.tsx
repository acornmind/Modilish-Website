"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import {
  dimensionLabels,
  dimensionValues,
  materials,
  slugify,
  unslug,
  type Dimension,
} from "@/lib/taxonomy";

const dims: Dimension[] = ["material", "pattern", "usage"];

const sortOptions = [
  { key: "date", label: "جدیدترین" },
  { key: "popularity", label: "محبوب‌ترین" },
  { key: "price", label: "ارزان‌ترین" },
  { key: "price-desc", label: "گران‌ترین" },
];

const fa = (n: number) => n.toLocaleString("fa-IR");

/**
 * Shared catalogue chrome — shop, search and material listings all use it.
 * Reads the current query via plain props (not `useSearchParams`) so the
 * pages that render it stay ordinary server components with no Suspense
 * boundary. Filters combine (جنس + طرح + کاربرد at once) and every applied
 * one is shown as a removable chip above the grid.
 */
export default function CatalogGrid({
  products,
  title,
  breadcrumb,
  showFilter = true,
  searchParams = {},
  pathname,
  pageSize = 16,
  chipPreview = 12,
  defaultSort = "date",
}: {
  products: Product[];
  title: string;
  breadcrumb: ReactNode;
  showFilter?: boolean;
  searchParams?: Record<string, string | undefined>;
  pathname: string;
  /** admin → تنظیمات → کاتالوگ و نمایش */
  pageSize?: number;
  chipPreview?: number;
  defaultSort?: string;
}) {
  const PAGE_SIZE = Math.max(4, pageSize);
  const CHIP_PREVIEW = Math.max(3, chipPreview);
  const orderby = searchParams.orderby ?? defaultSort;
  const { priceOf } = useCart();
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);

  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expanded, setExpanded] = useState<Partial<Record<Dimension, boolean>>>({});

  const sorted = useMemo(() => {
    // discount rules (admin → بازاریابی) count for price sorting too
    const effPrice = (p: Product) => priceOf(p).unit;
    const out = [...products];
    switch (orderby) {
      case "price":
        out.sort((a, b) => effPrice(a) - effPrice(b));
        break;
      case "price-desc":
        out.sort((a, b) => effPrice(b) - effPrice(a));
        break;
      case "popularity":
        out.sort((a, b) => b.rating - a.rating);
        break;
      default:
        out.sort((a, b) => b.id - a.id);
    }
    return out;
  }, [products, orderby, priceOf]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const slice = sorted.slice(
    (clampedPage - 1) * PAGE_SIZE,
    clampedPage * PAGE_SIZE,
  );

  const withParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v != null && v !== "") next.set(k, v);
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const currentSort =
    sortOptions.find((s) => s.key === orderby)?.label ?? "ترتیب نمایش";

  /* ---- applied filters (shown as removable chips) ---- */
  const applied: { key: string; label: string }[] = [];
  for (const dim of dims) {
    const v = searchParams[dim];
    if (v) applied.push({ key: dim, label: unslug(v) });
  }
  if (searchParams.q) applied.push({ key: "q", label: `«${searchParams.q}»` });
  const clearAll = withParams({
    material: null,
    pattern: null,
    usage: null,
    cat: null,
    q: null,
    page: null,
  });

  const chipHref = (dim: Dimension, slug: string, on: boolean) =>
    withParams({ [dim]: on ? null : slug, page: null });

  const renderGroup = (dim: Dimension, compact: boolean) => {
    const active = searchParams[dim];
    const all = dimensionValues(dim);
    const open = !!expanded[dim];
    const list = open ? all : all.slice(0, CHIP_PREVIEW);
    return (
      <div key={dim}>
        <p className="mb-2 text-xs font-bold text-[#2b2740]">
          {dimensionLabels[dim]}
        </p>
        <div className="flex flex-wrap gap-2">
          {list.map((v) => {
            const s = slugify(v.name);
            const on = active === s;
            return (
              <Link
                key={v.name}
                href={chipHref(dim, s, on)}
                onClick={() => compact && setFilterOpen(false)}
                className={`h-8 rounded-lg px-3 text-xs leading-8 transition ${
                  on
                    ? "bg-modi-purple-800 text-white"
                    : "bg-modi-gray-500 text-gray-800 hover:bg-modi-purple-200"
                }`}
              >
                {v.name}
                <span className={`mr-1 text-[10px] ${on ? "text-white/70" : "text-modi-gray-900"}`}>
                  {fa(v.count)}
                </span>
              </Link>
            );
          })}
          {all.length > CHIP_PREVIEW && (
            <button
              type="button"
              onClick={() => setExpanded((e) => ({ ...e, [dim]: !open }))}
              className="h-8 rounded-lg px-3 text-xs leading-8 text-modi-purple-800 underline-offset-4 hover:underline"
            >
              {open ? "نمایش کمتر" : `نمایش همه (${fa(all.length)})`}
            </button>
          )}
        </div>
      </div>
    );
  };

  const sortMenu = (
    <ul
      role="menu"
      className="absolute left-0 top-12 z-10 flex w-full min-w-40 flex-col gap-1 rounded-xl bg-white p-2 text-gray-800 shadow-[0_8px_24px_-8px_rgba(43,39,64,0.35)]"
    >
      {sortOptions.map((s) => (
        <li key={s.key} role="none">
          <Link
            role="menuitem"
            href={withParams({ orderby: s.key, page: null })}
            onClick={() => setSortOpen(false)}
            className={`flex rounded-lg px-3 py-2 text-xs hover:bg-modi-purple-200 ${
              s.key === orderby ? "font-bold text-modi-purple-800" : ""
            }`}
          >
            {s.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const hasResults = sorted.length > 0;

  return (
    <main className="page-bg">
      <section id="breadcrumb-title">
        <div className="flex h-14 items-center justify-between gap-4 bg-white px-4 shadow-sm lg:h-16 lg:px-8">
          <div className="modi-container flex items-center justify-between gap-4 px-0">
            <div className="truncate font-bold lg:text-lg">{title}</div>
            <div className="bread-crumb shrink-0 truncate text-xs text-modi-gray-900">
              {breadcrumb}
            </div>
          </div>
        </div>
      </section>

      <section
        id="main-shop"
        className="modi-container p-4 pb-12 lg:flex lg:items-start lg:gap-8 lg:px-8 lg:py-8"
      >
        {/* ---- desktop sidebar: always-visible filters ---- */}
        {showFilter && (
          <aside className="hidden shrink-0 lg:block lg:w-64">
            <div className="space-y-6 rounded-2xl bg-white p-5 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#2b2740]">فیلتر محصولات</p>
                {applied.length > 0 && (
                  <Link href={clearAll} className="text-xs text-modi-purple-800">
                    پاک کردن همه
                  </Link>
                )}
              </div>
              {dims.map((dim) => renderGroup(dim, false))}
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          {/* ---- mobile toolbar ---- */}
          <section id="filter" className="lg:hidden">
            <div className="mb-3 flex gap-3 text-sm text-modi-gray-900">
              {showFilter && (
                <div className="w-1/2">
                  <button
                    type="button"
                    aria-expanded={filterOpen}
                    onClick={() => setFilterOpen((v) => !v)}
                    className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl px-3 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.3)] ${
                      filterOpen
                        ? "bg-modi-purple-800 text-white"
                        : "bg-white text-modi-gray-900"
                    }`}
                  >
                    <span>
                      فیلتر
                      {applied.length > 0 && (
                        <span className="mr-1 rounded-full bg-modi-purple-200 px-1.5 text-[10px] text-modi-purple-800">
                          {fa(applied.length)}
                        </span>
                      )}
                    </span>
                    <svg width="15" height="12" viewBox="0 0 14.41 12.246" aria-hidden>
                      <path
                        d="M11.367,8.544a2.523,2.523,0,0,0,2.417-1.8H15.69a.721.721,0,0,0,0-1.441H13.784a2.523,2.523,0,0,0-4.835,0H2.721a.721.721,0,1,0,0,1.441H8.949A2.523,2.523,0,0,0,11.367,8.544ZM2.721,12.507a.721.721,0,1,0,0,1.441H4.266a2.523,2.523,0,0,0,4.835,0H15.69a.721.721,0,0,0,0-1.441H9.1a2.523,2.523,0,0,0-4.835,0Z"
                        transform="translate(-2 -3.502)"
                        fill="currentColor"
                        opacity="0.6"
                        fillRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              )}
              {hasResults && (
                <div className={`relative ${showFilter ? "w-1/2" : "w-full"}`}>
                  <button
                    type="button"
                    aria-expanded={sortOpen}
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex h-11 w-full items-center justify-between gap-2 rounded-xl bg-white px-3 text-modi-gray-900 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.3)]"
                  >
                    <span>{currentSort}</span>
                    <span className={`arrow-icon ${sortOpen ? "active" : ""}`}>
                      <svg width="11" height="7" viewBox="0 0 10.906 6.867" aria-hidden>
                        <path
                          d="M1 1l4 4 4-4"
                          fill="none"
                          stroke="#cbcbcb"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {sortOpen && sortMenu}
                </div>
              )}
            </div>

            {showFilter && filterOpen && (
              <div className="mb-3 space-y-4 rounded-2xl bg-white p-4 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.3)]">
                {dims.map((dim) => renderGroup(dim, true))}
              </div>
            )}
          </section>

          {/* ---- result count + applied chips ---- */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-modi-gray-900 lg:text-sm">
              {fa(sorted.length)} محصول
            </p>
            {/* desktop sort */}
            {hasResults && (
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((v) => !v)}
                  className="flex h-10 min-w-40 items-center justify-between gap-3 rounded-xl bg-white px-4 text-sm text-modi-gray-900 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.3)]"
                >
                  <span>{currentSort}</span>
                  <span className={`arrow-icon ${sortOpen ? "active" : ""}`}>
                    <svg width="11" height="7" viewBox="0 0 10.906 6.867" aria-hidden>
                      <path
                        d="M1 1l4 4 4-4"
                        fill="none"
                        stroke="#cbcbcb"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>
                {sortOpen && sortMenu}
              </div>
            )}
            {applied.length > 0 && (
              <div className="flex w-full flex-wrap items-center gap-2">
                {applied.map((a) => (
                  <Link
                    key={a.key}
                    href={withParams({ [a.key]: null, page: null })}
                    className="flex h-7 items-center gap-1.5 rounded-full bg-modi-purple-800 pl-2 pr-3 text-[11px] text-white"
                    aria-label={`حذف فیلتر ${a.label}`}
                  >
                    {a.label}
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                      ×
                    </span>
                  </Link>
                ))}
                {applied.length > 1 && (
                  <Link href={clearAll} className="text-[11px] text-modi-purple-800">
                    پاک کردن همه
                  </Link>
                )}
              </div>
            )}
          </div>

          {hasResults ? (
            <>
              <ul className="products flex flex-wrap gap-4 lg:grid lg:grid-cols-4 lg:gap-6">
                {slice.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </ul>

              {pageCount > 1 && (
                <nav aria-label="صفحه‌بندی" className="mt-8">
                  <ul className="page-numbers flex flex-wrap justify-center gap-2 text-sm">
                    {clampedPage > 1 && (
                      <li>
                        <Link
                          className="flex h-9 items-center rounded-lg bg-white px-3 shadow-sm"
                          href={withParams({ page: String(clampedPage - 1) })}
                        >
                          قبلی
                        </Link>
                      </li>
                    )}
                    {pageWindow(clampedPage, pageCount).map((n) => (
                      <li key={n}>
                        <Link
                          href={withParams({ page: String(n) })}
                          aria-current={n === clampedPage ? "page" : undefined}
                          className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 ${
                            n === clampedPage
                              ? "bg-modi-purple-800 font-bold text-white"
                              : "bg-white text-modi-gray-900 shadow-sm"
                          }`}
                        >
                          {fa(n)}
                        </Link>
                      </li>
                    ))}
                    {clampedPage < pageCount && (
                      <li>
                        <Link
                          className="flex h-9 items-center rounded-lg bg-white px-3 shadow-sm"
                          href={withParams({ page: String(clampedPage + 1) })}
                        >
                          بعدی
                        </Link>
                      </li>
                    )}
                  </ul>
                  <p className="mt-3 text-center text-[11px] text-modi-gray-900">
                    صفحه {fa(clampedPage)} از {fa(pageCount)}
                  </p>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              query={searchParams.q ?? searchParams.s}
              clearHref={applied.length > 0 ? clearAll : undefined}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyState({
  query,
  clearHref,
}: {
  query?: string;
  clearHref?: string;
}) {
  const popular = materials.slice(0, 6);
  return (
    <div className="rounded-2xl bg-white px-5 py-10 text-center shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-modi-purple-200 text-modi-purple-800">
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16.5 16.5L21 21M8.5 11h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <p className="mt-4 text-sm font-bold">
        {query ? `نتیجه‌ای برای «${query}» پیدا نشد` : "محصولی با این فیلترها پیدا نشد"}
      </p>
      <p className="mt-2 text-xs leading-6 text-modi-gray-900">
        املای کلمه را بررسی کنید یا عبارت کوتاه‌تری را امتحان کنید. این
        دسته‌ها را هم ببینید:
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {popular.map((m) => (
          <Link
            key={m.name}
            href={`/materials/${encodeURIComponent(slugify(m.name))}`}
            className="h-8 rounded-lg bg-modi-gray-500 px-3 text-xs leading-8 text-gray-800 hover:bg-modi-purple-200"
          >
            پارچه {m.name}
          </Link>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {clearHref && (
          <Link
            href={clearHref}
            className="inline-flex h-10 items-center rounded-xl bg-modi-purple-200 px-5 text-sm text-modi-purple-800"
          >
            حذف فیلترها
          </Link>
        )}
        <Link
          href="/shop"
          className="inline-flex h-10 items-center rounded-xl bg-modi-purple-800 px-5 text-sm text-white"
        >
          همه محصولات
        </Link>
      </div>
    </div>
  );
}

function pageWindow(current: number, total: number): number[] {
  const span = 2;
  const start = Math.max(1, current - span);
  const end = Math.min(total, current + span);
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}
