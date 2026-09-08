"use client";

import Link from "next/link";
import Image from "next/image";
import { useWishlist } from "@/lib/wishlist";
import { useCheckout } from "@/lib/checkout";
import { products, toman } from "@/lib/products";

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function AccountDashboard() {
  const wishlistIds = useWishlist();
  const checkout = useCheckout();
  const hasAddress = !!checkout && (checkout.method === "no-shipping" || !!checkout.address);
  const wishlistItems = products.filter((p) => wishlistIds.includes(p.id)).slice(0, 4);

  const stats: {
    href: string;
    label: string;
    value: string;
    icon: React.ReactNode;
  }[] = [
    {
      href: "/my-account/orders",
      label: "سفارش‌های من",
      value: "۰",
      icon: <path d="M6 2h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="1.6" />,
    },
    {
      href: "/my-account/wishlist",
      label: "علاقه‌مندی‌ها",
      value: fa(wishlistIds.length),
      icon: <path d="M12 20S3.5 14 3.5 8.5C3.5 5.4 5.9 3.5 8 3.5c1.9 0 3.3 1.1 4 2 .7-.9 2.1-2 4-2 2.1 0 4.5 1.9 4.5 5C20.5 14 12 20 12 20z" fill="currentColor" />,
    },
    {
      href: "/my-account/addresses",
      label: "آدرس ارسال",
      value: hasAddress ? "ثبت‌شده" : "ثبت نشده",
      icon: <path d="M12 2c3.9 0 6 2.7 6 6 0 4-6 12-6 12S6 12 6 8c0-3.3 2.1-6 6-6zm0 4a2 2 0 100 4 2 2 0 000-4z" fill="none" stroke="currentColor" strokeWidth="1.6" />,
    },
  ];

  return (
    <div className="text-right">
      {/* greeting */}
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-modi-purple-200 text-lg font-bold text-modi-purple-800">
          م
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">
            سلام مهمان عزیز
            <Link href="/my-account/logout" className="mr-2 text-xs font-normal text-modi-purple-800">
              (خودت نیستی؟)
            </Link>
          </p>
          <p className="mt-0.5 text-xs text-modi-gray-900">
            از این صفحه به سفارش‌ها، آدرس و علاقه‌مندی‌های خود دسترسی دارید.
          </p>
        </div>
      </div>

      {/* stat / quick-access tiles */}
      <div className="mt-5 grid grid-cols-3 gap-2 lg:gap-3">
        {stats.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-modi-gray-300 px-2 py-3 text-center transition hover:bg-modi-purple-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="text-modi-purple-800">
              {s.icon}
            </svg>
            <span className="text-sm font-bold">{s.value}</span>
            <span className="text-[11px] leading-tight text-modi-gray-900">{s.label}</span>
          </Link>
        ))}
      </div>

      {/* wishlist preview, only when it has items */}
      {wishlistItems.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <Link href="/my-account/wishlist" className="text-xs text-modi-purple-800">
              مشاهده همه
            </Link>
            <p className="text-sm font-bold">علاقه‌مندی‌های اخیر</p>
          </div>
          <ul className="flex gap-2">
            {wishlistItems.map((p) => (
              <li key={p.id} className="w-16">
                <Link href={`/product/${p.slug}`} className="block">
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={64}
                    height={64}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <span className="mt-1 block text-[10px]">
                    {toman(p.salePrice > 0 ? p.salePrice : p.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* address preview, only when one is saved */}
      {hasAddress && checkout && (
        <div className="mt-6 rounded-xl bg-modi-gray-300 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <Link href="/address" className="text-xs text-modi-purple-800">
              ویرایش
            </Link>
            <p className="text-xs font-bold">آدرس ارسال</p>
          </div>
          <p className="text-xs leading-6 text-gray-700">
            {checkout.method === "shipping"
              ? `${checkout.name} — ${checkout.state}، ${checkout.city}، ${checkout.address}`
              : `دریافت حضوری — ${checkout.pickupDay}، ساعت ${checkout.pickupHour}`}
          </p>
        </div>
      )}

      {/* quick links */}
      <nav className="mt-6 flex flex-wrap gap-2 border-t border-modi-gray-500 pt-4 text-xs">
        <Link href="/my-account/account-details" className="text-modi-purple-800">
          ویرایش اطلاعات حساب
        </Link>
        <span className="text-modi-gray-500">·</span>
        <Link href="/shop" className="text-modi-purple-800">
          ادامه خرید
        </Link>
      </nav>
    </div>
  );
}
