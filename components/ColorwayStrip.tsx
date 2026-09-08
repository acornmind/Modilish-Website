"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { attr } from "@/lib/taxonomy";
import type { Product } from "@/lib/products";

/**
 * Compact رنگبندی — swatch thumbnails of every colourway of this design,
 * with the one being viewed marked. Faster to scan than a rail of full
 * product cards, and it makes "which one am I on?" obvious.
 *
 * Wrapped in its own white card (matching the buy panel / tabs siblings)
 * so it doesn't blend into the sections above and below it. Mobile stays a
 * single scrolling row; desktop packs it into a fixed 2-row grid that
 * scrolls horizontally past that, with arrow buttons like the home rails.
 */
export default function ColorwayStrip({
  current,
  variants,
}: {
  current: Product;
  variants: Product[];
}) {
  const all = [current, ...variants];
  const colorLabel = (p: Product) => attr(p, "رنگ‌ها") ?? p.name;
  const railRef = useRef<HTMLUListElement>(null);
  // Only pack into two rows once there are more colours than comfortably
  // fit on one line (same threshold that brings in the scroll arrows) —
  // otherwise grid-flow-col + a forced row count leaves a half-empty
  // second row for e.g. 3 colours.
  const packed = all.length > 8;

  const scroll = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className="mt-5 rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">رنگبندی</h2>
        <span className="text-xs text-modi-gray-900">
          {all.length.toLocaleString("fa-IR")} رنگ
        </span>

        {packed && (
          <div className="hidden gap-2 lg:flex">
            {/* same convention as CategoryCircles/ProductCarousel: icon
                direction matches the action, قبلی renders first so it lands
                on the right of the pair (RTL) and both icons point outward */}
            <button
              type="button"
              aria-label="رنگ‌های قبلی"
              onClick={() => scroll(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-modi-gray-300 text-modi-purple-800 hover:bg-modi-purple-200"
            >
              <svg width="7" height="11" viewBox="0 0 8 13" aria-hidden>
                <path d="M1 1.5L6.5 6.5 1 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="رنگ‌های بعدی"
              onClick={() => scroll(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-modi-gray-300 text-modi-purple-800 hover:bg-modi-purple-200"
            >
              <svg width="7" height="11" viewBox="0 0 8 13" aria-hidden>
                <path d="M7 1.5L1.5 6.5 7 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <ul
        ref={railRef}
        className={`no-scrollbar -mx-4 grid grid-flow-col grid-rows-1 gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0 lg:scroll-smooth ${
          packed ? "lg:grid-rows-2 lg:gap-x-3 lg:gap-y-4" : ""
        }`}
        style={{ gridAutoColumns: "72px" }}
      >
        {all.map((p) => {
          const isCurrent = p.id === current.id;
          return (
            <li key={p.id} className="w-[72px] text-center">
              <Link
                href={`/product/${p.slug}`}
                aria-current={isCurrent ? "page" : undefined}
                className="block"
              >
                <span
                  className={`block overflow-hidden rounded-xl border-2 p-0.5 transition ${
                    isCurrent
                      ? "border-modi-purple-800"
                      : "border-transparent hover:border-modi-purple-500"
                  }`}
                >
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={64}
                    height={64}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                </span>
                <span
                  className={`mt-1.5 block truncate text-[11px] leading-4 ${
                    isCurrent ? "font-bold text-modi-purple-800" : "text-gray-700"
                  }`}
                  title={colorLabel(p)}
                >
                  {colorLabel(p)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
