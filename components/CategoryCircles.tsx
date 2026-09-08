"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";

export type CircleLink = { label: string; href: string; img: string };

/**
 * Home page circle rail — emphasised, clickable categories. A single
 * horizontally-scrolling row at every breakpoint with overlay prev/next
 * arrows on desktop. The list comes from the published home layout's
 * «دسته‌های منتخب» section (admin → صفحه اصلی).
 */
export default function CategoryCircles({ items }: { items: CircleLink[] }) {
  const railRef = useRef<HTMLElement>(null);

  const scroll = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="relative bg-white">
      <nav
        ref={railRef}
        aria-label="دسته‌های منتخب"
        className="no-scrollbar modi-container flex w-full gap-4 overflow-x-auto px-4 py-4 lg:gap-6 lg:px-8 lg:py-6"
      >
        {items.map((c) => (
          <Link
            key={c.label + c.href}
            href={c.href}
            className="flex w-[68px] shrink-0 flex-col items-center gap-2 text-center lg:w-24 lg:gap-3"
          >
            <span className="block h-[68px] w-[68px] overflow-hidden rounded-full border-2 border-modi-purple-200 p-[3px] transition lg:h-24 lg:w-24 lg:hover:border-modi-purple-800">
              <Image
                src={c.img}
                alt={c.label}
                width={62}
                height={62}
                className="h-full w-full rounded-full object-cover"
              />
            </span>
            <span className="text-[11px] leading-tight text-[#2b2740] lg:text-sm">
              {c.label}
            </span>
          </Link>
        ))}
      </nav>

      <button
        type="button"
        aria-label="دسته‌های بیشتر"
        onClick={() => scroll(-1)}
        className="absolute inset-y-0 left-0 z-[1] hidden w-12 items-center justify-center bg-gradient-to-r from-white via-white/90 to-transparent lg:flex"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-modi-purple-800 shadow-[0_2px_14px_-6px_rgba(43,39,64,0.5)] hover:bg-modi-purple-200">
          <svg width="8" height="13" viewBox="0 0 8 13" aria-hidden>
            <path d="M7 1.5L1.5 6.5 7 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <button
        type="button"
        aria-label="دسته‌های قبلی"
        onClick={() => scroll(1)}
        className="absolute inset-y-0 right-0 z-[1] hidden w-12 items-center justify-center bg-gradient-to-l from-white via-white/90 to-transparent lg:flex"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-modi-purple-800 shadow-[0_2px_14px_-6px_rgba(43,39,64,0.5)] hover:bg-modi-purple-200">
          <svg width="8" height="13" viewBox="0 0 8 13" aria-hidden>
            <path d="M1 1.5L6.5 6.5 1 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>
    </div>
  );
}
