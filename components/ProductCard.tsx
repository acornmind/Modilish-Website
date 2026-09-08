"use client";

import Link from "next/link";
import Image from "next/image";
import Icon from "./Icon";
import WishlistButton from "./WishlistButton";
import { useCart, useStrings, splitLength } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { toman, type Product } from "@/lib/products";

export default function ProductCard({ product }: { product: Product }) {
  const { add, priceOf } = useCart();
  const t = useStrings();
  // discount rules from admin → بازاریابی apply here, not just the sale price
  const price = priceOf(product);
  const onSale = price.unit < price.list;

  return (
    <li className="product relative flex basis-[calc(50%-8px)] flex-col rounded-2xl bg-white p-2.5 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] transition lg:basis-auto lg:p-3 lg:hover:-translate-y-1 lg:hover:shadow-[0_12px_28px_-12px_rgba(43,39,64,0.45)]">
      <WishlistButton
        productId={product.id}
        size={30}
        className="absolute right-4 top-4 z-[1] lg:right-5 lg:top-5"
      />
      {onSale && (
        <span className="absolute left-4 top-4 z-[1] rounded-lg bg-[#C40000] px-1.5 py-0.5 text-[10px] font-bold text-white lg:left-5 lg:top-5">
          {price.percentOff.toLocaleString("fa-IR")}٪
        </span>
      )}
      <Link href={`/product/${product.slug}`} className="block">
        <Image
          src={product.image}
          alt={product.name}
          width={220}
          height={220}
          className="aspect-square w-full rounded-xl object-cover"
        />
        <h2>{product.name}</h2>
      </Link>

      <div className="price">
        {onSale && (
          <del className="ml-1 text-[11px] text-modi-gray-900">
            {toman(price.list)}
          </del>
        )}
        {toman(price.unit)}
      </div>

      {/* Adds the minimum length and stays on the page — browsing continues,
          the toast offers the jump to the cart. */}
      <button
        className="add_to_cart_button"
        disabled={product.meters <= 0}
        onClick={() => {
          const { meter, centimeter } = splitLength(product.limit || 1);
          add(product.id, meter, centimeter);
          toast(`«${product.name}» به سبد خرید اضافه شد.`, {
            label: "مشاهده سبد",
            href: "/cart",
          });
        }}
      >
        <Icon src="/img/add-t-cart.svg" size={15} />
        {product.meters <= 0 ? "ناموجود" : t("addToCart", "ثبت سفارش")}
      </button>
    </li>
  );
}
