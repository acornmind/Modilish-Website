import { paymentStatusLabel, statusMeta, type OrderStatus, type PaymentStatus } from "@/lib/orders";

const toneClass = {
  ok: "bg-modi-success-bg text-modi-success",
  info: "bg-modi-info-bg text-modi-info",
  warn: "bg-modi-warning-bg text-modi-warning",
  danger: "bg-modi-danger-bg text-modi-danger",
  muted: "bg-modi-gray-500 text-modi-gray-900",
};

export default function StatusPill({ status }: { status: OrderStatus }) {
  const meta = statusMeta[status];
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[meta.tone]}`}>
      {meta.label}
    </span>
  );
}

/** "payment status as a small secondary tag when it is anything other than paid" — §4.2.3 */
export function PaymentStatusTag({ paymentStatus }: { paymentStatus: PaymentStatus }) {
  if (paymentStatus === "paid") return null;
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-modi-gray-700 px-2 py-0.5 text-[10px] font-bold text-modi-gray-900">
      {paymentStatusLabel[paymentStatus]}
    </span>
  );
}
