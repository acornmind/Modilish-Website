"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "./Icon";
import WishlistButton from "./WishlistButton";
import { useCart, useStrings, splitLength } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { toman, type Product } from "@/lib/products";

/** Horizontal product rail — homepage rows, رنگبندی and محصولات مرتبط. */
export default function ProductCarousel({
  title,
  href,
  products,
}: {
  title: string;
  href?: string;
  products: Product[];
}) {
  const { add, priceOf } = useCart();
  const t = useStrings();
  const railRef = useRef<HTMLUListElement>(null);

  const scroll = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className="modi-container mt-6 px-4 lg:px-8">
      <div className="mb-3 flex items-center justify-between">
        {href ? (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs text-modi-purple-800 lg:order-2 lg:text-sm"
          >
            <span>{t("viewAll", "مشاهده همه")}</span>
            <svg width="7" height="11" viewBox="0 0 7 11" aria-hidden>
              <path
                d="M5.5 1l-4 4.5 4 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        ) : (
          <span />
        )}
        <h2 className="text-sm font-bold lg:order-1 lg:text-lg">{title}</h2>

        <div className="hidden gap-2 lg:order-3 lg:flex">
          <button
            aria-label="قبلی"
            onClick={() => scroll(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-modi-purple-800 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.4)] hover:bg-modi-purple-200"
          >
            <svg width="8" height="13" viewBox="0 0 8 13" aria-hidden>
              <path d="M1 1.5L6.5 6.5 1 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            aria-label="بعدی"
            onClick={() => scroll(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-modi-purple-800 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.4)] hover:bg-modi-purple-200"
          >
            <svg width="8" height="13" viewBox="0 0 8 13" aria-hidden>
              <path d="M7 1.5L1.5 6.5 7 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <ul
        ref={railRef}
        className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:gap-4 lg:px-0 lg:scroll-smooth"
      >
        {products.map((p) => {
          const price = priceOf(p);
          const onSale = price.unit < price.list;
          return (
            <li
              key={p.id}
              className="product relative flex w-40 shrink-0 flex-col rounded-2xl bg-white p-2.5 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]"
            >
              <WishlistButton
                productId={p.id}
                size={28}
                className="absolute right-4 top-4 z-[1]"
              />
              {onSale && (
                <span className="absolute left-4 top-4 z-[1] rounded-lg bg-[#C40000] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {price.percentOff.toLocaleString("fa-IR")}٪
                </span>
              )}
              <Link href={`/product/${p.slug}`} className="block">
                <Image
                  src={p.image}
                  alt={p.name}
                  width={160}
                  height={160}
                  className="aspect-square w-full rounded-xl object-cover"
                />
                <h2>{p.name}</h2>
              </Link>
              <div className="price">
                {onSale && <del className="ml-1 text-[11px] text-modi-gray-900">{toman(price.list)}</del>}
                {toman(price.unit)}
              </div>
              <button
                className="add_to_cart_button"
                disabled={p.meters <= 0}
                onClick={() => {
                  const { meter, centimeter } = splitLength(p.limit || 1);
                  add(p.id, meter, centimeter);
                  toast(`«${p.name}» به سبد خرید اضافه شد.`, {
                    label: "مشاهده سبد",
                    href: "/cart",
                  });
                }}
              >
                <Icon src="/img/add-t-cart.svg" size={15} />
                {p.meters <= 0 ? "ناموجود" : t("addToCart", "ثبت سفارش")}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
