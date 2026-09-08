"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCheckout } from "@/lib/checkout";
import { ordersForPhoneAction } from "@/lib/orderActions";
import { formatJalali, formatQty, orderNumber, statusMeta, type Order } from "@/lib/orders";
import { toman } from "@/lib/products";

/** Customer's orders — the ones placed with the phone verified at checkout (§8). */
export default function MyOrders() {
  const info = useCheckout();
  const phone = info?.mobile || info?.phone || "";
  const [fetched, setFetched] = useState<{ phone: string; orders: Order[] } | null>(null);

  useEffect(() => {
    if (!phone) return;
    let alive = true;
    ordersForPhoneAction(phone)
      .then((orders) => alive && setFetched({ phone, orders }))
      .catch(() => alive && setFetched({ phone, orders: [] }));
    return () => {
      alive = false;
    };
  }, [phone]);

  const orders = !phone ? [] : fetched?.phone === phone ? fetched.orders : null;

  if (orders === null) return <p className="py-4 text-xs text-modi-gray-900">در حال بارگذاری…</p>;

  if (orders.length === 0)
    return (
      <div className="border-t-2 border-[#3d9cd2] pt-4 text-right">
        <p>{phone ? "هنوز سفارشی با این شماره ثبت نشده است." : "برای مشاهده سفارش‌ها، ابتدا هنگام خرید شماره موبایل خود را تایید کنید."}</p>
        <Link href="/shop" className="mt-3 inline-flex h-9 items-center rounded-lg bg-modi-purple-200 px-4 text-xs font-bold text-modi-purple-800">
          مشاهده محصولات
        </Link>
      </div>
    );

  return (
    <div className="space-y-3 text-right">
      {orders.map((o) => (
        <div key={o.key} className="rounded-xl bg-modi-gray-300 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tabular-nums">سفارش {orderNumber(o.key)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${o.status === "delivered" ? "bg-[#eaf7dc] text-[#5c9a00]" : o.status === "cancelled" || o.status === "returned" ? "bg-[#FFE3E3] text-[#C40000]" : "bg-modi-purple-200 text-modi-purple-800"}`}>
              {statusMeta[o.status].label}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-modi-gray-900">
            {formatJalali(o.createdAt)} · {o.delivery.type === "post" ? `ارسال با ${o.delivery.carrier}${o.delivery.trackingCode ? ` · کد رهگیری ${o.delivery.trackingCode}` : ""}` : `دریافت حضوری ${o.delivery.day} ساعت ${o.delivery.hour}`}
          </p>
          <ul className="mt-2 space-y-1.5">
            {o.lines.map((l, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <Image src={l.image} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
                <Link href={`/product/${l.slug}`} className="flex-1 truncate">{l.name}</Link>
                <span className="text-modi-gray-900">{formatQty(l)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-bold">{toman(o.total)}</p>
        </div>
      ))}
    </div>
  );
}
