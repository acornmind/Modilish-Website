"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatOrderTime, itemsSummary, orderNumber, primaryAction, type Order } from "@/lib/orders";
import { setOrderStatusAction } from "@/lib/orderActions";
import { tomanShort } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import StatusPill, { PaymentStatusTag } from "./StatusPill";

function DeliveryIcon({ type }: { type: "post" | "pickup" }) {
  return type === "post" ? (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden className="text-modi-purple-800">
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM6.5 18a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM17.5 18a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden className="text-modi-purple-800">
      <path d="M12 2c3.9 0 6 2.7 6 6 0 4-6 12-6 12S6 12 6 8c0-3.3 2.1-6 6-6zm0 4a2 2 0 100 4 2 2 0 000-4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function deliveryLabel(order: Order) {
  return order.delivery.type === "post" ? order.delivery.carrier : `حضوری · ${order.delivery.day} ${order.delivery.hour}`;
}

/** One order row — shared by the dashboard and the orders list (§4.1, §4.2.1). */
export default function OrderRow({ order, selected, onSelect }: { order: Order; selected?: boolean; onSelect?: (v: boolean) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const action = primaryAction(order);
  const open = () => router.push(`/admin/orders/${order.key}`);

  const quick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!action) return;
    // shipping needs a tracking code → the detail page asks for it
    if (action.to === "shipped") return open();
    start(async () => {
      try {
        await setOrderStatusAction(order.key, action.to);
        toast(`سفارش ${orderNumber(order.key)}: ${action.label}`);
        router.refresh();
      } catch (err) {
        toast(err instanceof Error ? err.message : "انجام نشد");
      }
    });
  };

  const thumbs = (size: number) => (
    <span className="flex -space-x-1.5 space-x-reverse">
      {order.lines.slice(0, 3).map((l, i) => (
        <Image key={i} src={l.image} alt="" width={size} height={size} className="shrink-0 rounded-md border border-white object-cover" style={{ width: size, height: size }} />
      ))}
    </span>
  );
  const actionBtn = action && (
    <button type="button" onClick={quick} disabled={pending} className="whitespace-nowrap rounded-lg bg-modi-purple-200 px-3 py-1.5 text-xs font-bold text-modi-purple-800 hover:bg-modi-purple-500 hover:text-white disabled:opacity-60">
      {action.label}
    </button>
  );

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === "Enter" && open()}
      className={`block cursor-pointer border-t border-[#ede9f2] px-1 py-3 first:border-t-0 hover:bg-modi-purple-200/40 ${selected ? "bg-modi-purple-200/30" : ""}`}
    >
      {/* desktop row */}
      <div className={`hidden items-center gap-3 lg:grid ${onSelect ? "lg:grid-cols-[20px_1fr_1fr_1.2fr_1.3fr_.9fr_1.2fr_1fr_auto]" : "lg:grid-cols-[1fr_1fr_1.2fr_1.3fr_.9fr_1.2fr_1fr_auto]"}`}>
        {onSelect && (
          <input type="checkbox" checked={!!selected} onClick={(e) => e.stopPropagation()} onChange={(e) => onSelect(e.target.checked)} aria-label="انتخاب" className="h-4 w-4" />
        )}
        <span className="text-sm font-bold tabular-nums">
          {orderNumber(order.key)}
          {order.source === "manual" && <span className="ms-1 rounded bg-modi-gray-500 px-1 text-[10px] font-normal text-modi-gray-900">دستی</span>}
        </span>
        <span className="text-xs text-modi-gray-900 tabular-nums">{formatOrderTime(order.createdAt)}</span>
        <span className="text-sm">
          {order.customer.name}
          <span className="block text-xs text-modi-gray-900 tabular-nums" dir="ltr">{order.customer.phone}</span>
        </span>
        <span className="flex items-center gap-1">
          {thumbs(22)}
          <span className="text-xs text-modi-gray-900">{itemsSummary(order)}</span>
        </span>
        <span className="text-sm font-bold tabular-nums">{tomanShort(order.total)}</span>
        <span className="flex items-center gap-1.5 text-xs text-[#2b2740]">
          <DeliveryIcon type={order.delivery.type} />
          {deliveryLabel(order)}
        </span>
        <span className="flex flex-wrap items-center gap-1">
          <StatusPill status={order.status} />
          <PaymentStatusTag paymentStatus={order.paymentStatus} />
        </span>
        <span>{actionBtn}</span>
      </div>

      {/* mobile card */}
      <div className="flex flex-col gap-1.5 lg:hidden">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tabular-nums">{orderNumber(order.key)}</span>
          <span className="flex flex-wrap items-center justify-end gap-1">
            <StatusPill status={order.status} />
            <PaymentStatusTag paymentStatus={order.paymentStatus} />
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-modi-gray-900">
          <span>
            {order.customer.name} ·{" "}
            <a href={`tel:${order.customer.phone}`} onClick={(e) => e.stopPropagation()} className="tabular-nums text-modi-purple-800">
              {order.customer.phone}
            </a>
          </span>
          <span className="tabular-nums">{formatOrderTime(order.createdAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            {thumbs(20)}
            <span className="text-[11px] text-modi-gray-900">{itemsSummary(order)}</span>
          </span>
          <span className="text-sm font-bold tabular-nums">{tomanShort(order.total)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[#2b2740]">
            <DeliveryIcon type={order.delivery.type} />
            {deliveryLabel(order)}
          </span>
          {actionBtn}
        </div>
      </div>
    </div>
  );
}
