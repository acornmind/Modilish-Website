"use client";

import { useWishlist, toggleWishlist } from "@/lib/wishlist";
import { toast } from "@/lib/toast";

/** Heart toggle — the entry point that feeds /my-account/wishlist. */
export default function WishlistButton({
  productId,
  size = 34,
  className = "",
}: {
  productId: number;
  size?: number;
  className?: string;
}) {
  const ids = useWishlist();
  const on = ids.includes(productId);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(productId);
        toast(
          on ? "از علاقه‌مندی‌ها حذف شد." : "به علاقه‌مندی‌ها اضافه شد.",
          on ? undefined : { label: "مشاهده", href: "/my-account/wishlist" },
        );
      }}
      style={{ width: size, height: size }}
      className={`flex items-center justify-center rounded-full bg-white/95 shadow-[0_2px_10px_-4px_rgba(43,39,64,0.5)] transition active:scale-95 ${className}`}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 20S3.5 14 3.5 8.5C3.5 5.4 5.9 3.5 8 3.5c1.9 0 3.3 1.1 4 2 .7-.9 2.1-2 4-2 2.1 0 4.5 1.9 4.5 5C20.5 14 12 20 12 20z"
          fill={on ? "#e0245e" : "none"}
          stroke={on ? "#e0245e" : "#6b3fa0"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
