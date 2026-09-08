// Order model + pure helpers — browser-safe (no fs). Persistence lives in
// lib/orderStore.ts. Shapes follow docs/admin-spec.md §4.2 / §6.

export type OrderStatus =
  | "pending_payment"
  | "failed"
  | "paid"
  | "preparing"
  | "shipped"
  | "ready_for_pickup"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "unpaid" | "paid" | "cod_pending" | "refunded" | "partially_refunded";

export type PaymentMethod = "zarinpal" | "cod" | "wallet" | "card_to_card" | "cash" | "link";

export type OrderLine = {
  slug: string;
  name: string;
  image: string;
  unit: "متر" | "عدد";
  /** metres (decimal) or pieces */
  qty: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
};

export type OrderDelivery =
  | {
      type: "post";
      carrier: string;
      recipient: string;
      mobile: string;
      landline?: string;
      province: string;
      city: string;
      postcode: string;
      address: string;
      trackingCode?: string;
    }
  | { type: "pickup"; day: string; hour: string; cod: boolean };

export type OrderEvent = {
  at: string;
  type: "created" | "status" | "note" | "sms" | "edit" | "refund";
  text: string;
  by: string;
};

export type Order = {
  /** Latin, URL-safe: 1405-000132 */
  key: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  paidAt?: string;
  customer: { name: string; phone: string; nationalCode?: string; referral?: string };
  delivery: OrderDelivery;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shipping: number;
  total: number;
  customerNote?: string;
  internalNotes: string[];
  events: OrderEvent[];
  source: "web" | "manual";
  cancelReason?: string;
};

export const statusMeta: Record<OrderStatus, { label: string; tone: "ok" | "info" | "warn" | "danger" | "muted" }> = {
  pending_payment: { label: "در انتظار پرداخت", tone: "muted" },
  failed: { label: "پرداخت ناموفق", tone: "danger" },
  paid: { label: "پرداخت‌شده", tone: "ok" },
  preparing: { label: "در حال آماده‌سازی", tone: "info" },
  shipped: { label: "ارسال‌شده", tone: "info" },
  ready_for_pickup: { label: "آماده تحویل حضوری", tone: "warn" },
  delivered: { label: "تحویل‌شده", tone: "ok" },
  cancelled: { label: "لغو‌شده", tone: "danger" },
  returned: { label: "مرجوع‌شده", tone: "danger" },
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: "پرداخت‌نشده",
  paid: "پرداخت‌شده",
  cod_pending: "پرداخت در محل",
  refunded: "بازپرداخت‌شده",
  partially_refunded: "بازپرداخت جزئی",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  zarinpal: "زرین‌پال",
  cod: "پرداخت در محل",
  wallet: "کیف پول",
  card_to_card: "کارت‌به‌کارت",
  cash: "نقدی",
  link: "لینک پرداخت",
};

/** Allowed transitions — §4.2.3. Backward moves are owner-only and need a reason. */
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "failed", "preparing", "cancelled"],
  failed: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "ready_for_pickup", "cancelled"],
  shipped: ["delivered", "returned"],
  ready_for_pickup: ["delivered", "cancelled"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

/** The primary next step for a status (the big purple button) — §4.2.1/§4.2.2. */
export function primaryAction(o: Pick<Order, "status" | "delivery">): { label: string; to: OrderStatus } | null {
  switch (o.status) {
    case "pending_payment":
      return o.delivery.type === "pickup" && o.delivery.cod ? { label: "شروع آماده‌سازی", to: "preparing" } : { label: "ثبت پرداخت", to: "paid" };
    case "failed":
      return { label: "ثبت پرداخت", to: "paid" };
    case "paid":
      return { label: "شروع آماده‌سازی", to: "preparing" };
    case "preparing":
      return o.delivery.type === "pickup" ? { label: "آماده تحویل", to: "ready_for_pickup" } : { label: "ثبت کد رهگیری", to: "shipped" };
    case "shipped":
    case "ready_for_pickup":
      return { label: "تحویل شد", to: "delivered" };
    default:
      return null;
  }
}

export const fa = (n: number) => n.toLocaleString("fa-IR");

export function formatQty(line: Pick<OrderLine, "qty" | "unit">) {
  if (line.unit !== "متر") return `${fa(line.qty)} عدد`;
  const m = Math.floor(line.qty);
  const cm = Math.round((line.qty - m) * 100);
  if (m === 0) return `${fa(cm)} سانتی‌متر`;
  return `${fa(m)} متر${cm ? ` و ${fa(cm)} سانتی‌متر` : ""}`;
}

export function orderNumber(key: string) {
  return key.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function metersOf(o: Order) {
  return o.lines.reduce((s, l) => s + (l.unit === "متر" ? l.qty : 0), 0);
}

/** "تاریخ و ساعت (Jalali, relative for < 24 h)" — §4.2.1 */
export function formatOrderTime(iso: string, now = Date.now()) {
  const t = new Date(iso).getTime();
  const diffMin = Math.round((now - t) / 60000);
  if (diffMin < 1) return "همین الان";
  if (diffMin < 60) return `${fa(diffMin)} دقیقه پیش`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${fa(diffH)} ساعت پیش`;
  const d = new Date(t);
  const time = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(d);
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startToday.getDate() - 1);
  if (d >= startYesterday && d < startToday) return `دیروز، ${time}`;
  const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return `${date} - ${time}`;
}

export function formatJalali(iso: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function itemsSummary(o: Order) {
  const m = metersOf(o);
  const pieces = o.lines.reduce((s, l) => s + (l.unit === "عدد" ? l.qty : 0), 0);
  const parts = [`${fa(o.lines.length)} قلم`];
  if (m > 0) parts.push(`${fa(Math.round(m * 10) / 10)} متر`);
  if (pieces > 0) parts.push(`${fa(pieces)} عدد`);
  return parts.join(" · ");
}
