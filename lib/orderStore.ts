// Server-only persistence for orders, customer notes, reviews, product
// questions, contact messages, the SMS log and notification read-state — all
// in Supabase. Never import from a "use client" file.
import { cache } from "react";
import { products, type Product } from "./products";
import { ensureHydrated } from "./productStore";
import { audit, getSite, saveSettings } from "./siteStore";
import { integrationHealth, type Coupon } from "./siteContent";
import { cartTierDiscount, priceOf, shippingFor } from "./pricing";
import {
  metersOf,
  orderNumber,
  statusMeta,
  transitions,
  type Order,
  type OrderEvent,
  type OrderLine,
  type OrderStatus,
} from "./orders";
import { check, supabaseAdmin, unwrap } from "./supabase/server";

const ACTOR = "مو (مالک)";
const now = () => new Date().toISOString();
const iso = (s: string) => new Date(s).toISOString();
const faN = (n: number) => n.toLocaleString("fa-IR");

/* ---------------- orders ---------------- */

type EventRow = { at: string; type: OrderEvent["type"]; text: string; by: string };
type OrderRow = {
  key: string;
  created_at: string;
  status: OrderStatus;
  payment_status: Order["paymentStatus"];
  payment_method: Order["paymentMethod"];
  payment_ref: string | null;
  paid_at: string | null;
  customer: Order["customer"];
  delivery: Order["delivery"];
  lines: OrderLine[] | null;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping: number;
  total: number;
  customer_note: string | null;
  internal_notes: string[] | null;
  source: Order["source"];
  cancel_reason: string | null;
  order_events: EventRow[] | null;
};

const ORDER_SELECT = "*, order_events(*)";

function rowToOrder(r: OrderRow): Order {
  return {
    key: r.key,
    createdAt: iso(r.created_at),
    status: r.status,
    paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    paymentRef: r.payment_ref ?? undefined,
    paidAt: r.paid_at ? iso(r.paid_at) : undefined,
    customer: r.customer,
    delivery: r.delivery,
    lines: r.lines ?? [],
    subtotal: r.subtotal,
    discount: r.discount,
    couponCode: r.coupon_code ?? undefined,
    shipping: r.shipping,
    total: r.total,
    customerNote: r.customer_note ?? undefined,
    internalNotes: r.internal_notes ?? [],
    events: (r.order_events ?? []).map((e) => ({ at: iso(e.at), type: e.type, text: e.text, by: e.by })),
    source: r.source,
    cancelReason: r.cancel_reason ?? undefined,
  };
}

function orderToRow(o: Order) {
  return {
    key: o.key,
    created_at: o.createdAt,
    status: o.status,
    payment_status: o.paymentStatus,
    payment_method: o.paymentMethod,
    payment_ref: o.paymentRef ?? null,
    paid_at: o.paidAt ?? null,
    customer: o.customer,
    delivery: o.delivery,
    lines: o.lines,
    subtotal: o.subtotal,
    discount: o.discount,
    coupon_code: o.couponCode ?? null,
    shipping: o.shipping,
    total: o.total,
    customer_note: o.customerNote ?? null,
    internal_notes: o.internalNotes,
    source: o.source,
    cancel_reason: o.cancelReason ?? null,
  };
}

/** Newest first. Memoised per request. */
export const getOrders = cache(async (): Promise<Order[]> => {
  const rows = unwrap<OrderRow[]>(
    await supabaseAdmin()
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { referencedTable: "order_events" }),
  );
  return rows.map(rowToOrder);
});

export const getOrder = cache(async (key: string): Promise<Order | undefined> => {
  const row = check<OrderRow>(
    await supabaseAdmin().from("orders").select(ORDER_SELECT).eq("key", key).order("id", { referencedTable: "order_events" }).maybeSingle(),
  );
  return row ? rowToOrder(row) : undefined;
});

/** Writes the order row and replaces its event log (events have no id of their own in the model). */
async function saveOrder(order: Order) {
  const db = supabaseAdmin();
  check(await db.from("orders").upsert(orderToRow(order)));
  check(await db.from("order_events").delete().eq("order_key", order.key));
  if (order.events.length > 0)
    check(await db.from("order_events").insert(order.events.map((e) => ({ order_key: order.key, at: e.at, type: e.type, text: e.text, by: e.by }))));
}

function nextKey(orders: Order[]) {
  const year = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric" }).format(new Date()).replace(/\D/g, "");
  const seq = orders.filter((o) => o.key.startsWith(year)).reduce((m, o) => Math.max(m, Number(o.key.split("-")[1]) || 0), 0) + 1;
  return `${year}-${String(seq).padStart(6, "0")}`;
}

export type NewOrderInput = {
  customer: Order["customer"];
  delivery: Order["delivery"];
  lines: { slug: string; qty: number; note?: string }[];
  couponCode?: string;
  discount?: number;
  customerNote?: string;
  paymentMethod: Order["paymentMethod"];
  source: Order["source"];
  /** manual orders can be marked paid immediately (card-to-card / cash) */
  markPaid?: boolean;
  paymentRef?: string;
};

/* ---------------- coupons & referral — §4.11.2 / §4.11.7 ---------------- */

export type CouponCheck =
  | { ok: true; coupon: Coupon; discountToman: number; label: string }
  | { ok: false; message: string };

/** Validates a code against Settings → coupons for a given goods total. */
export async function checkCoupon(code: string, cartTotalToman: number): Promise<CouponCheck> {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return { ok: false, message: "کد تخفیف را وارد کنید." };
  const coupon = (await getSite()).settings.coupons.find((c) => c.code.trim().toLowerCase() === normalized);
  if (!coupon || !coupon.active) return { ok: false, message: "کد تخفیف نامعتبر است." };
  if (coupon.validUntil && new Date(coupon.validUntil).getTime() + 86400000 < Date.now()) return { ok: false, message: "مهلت استفاده از این کد تمام شده است." };
  if (coupon.usageCap > 0 && coupon.used >= coupon.usageCap) return { ok: false, message: "سقف استفاده از این کد پر شده است." };
  if (cartTotalToman < coupon.minCartToman) return { ok: false, message: `این کد برای خرید بالای ${faN(coupon.minCartToman)} تومان است.` };
  let discountToman = 0;
  let label = "ارسال رایگان";
  if (coupon.kind === "percent") {
    discountToman = Math.round((cartTotalToman * coupon.value) / 100);
    if (coupon.maxDiscountToman > 0) discountToman = Math.min(discountToman, coupon.maxDiscountToman);
    label = `${faN(coupon.value)}٪ تخفیف`;
  } else if (coupon.kind === "fixed") {
    discountToman = Math.min(coupon.value, cartTotalToman);
    label = `${faN(coupon.value)} تومان تخفیف`;
  }
  return { ok: true, coupon, discountToman, label };
}

/** A customer's personal referral code — shown in their account and on the customer page. */
export function referralCodeFor(phone: string) {
  return "MD" + phone.replace(/\D/g, "").slice(-5);
}

export async function createOrder(input: NewOrderInput): Promise<Order> {
  await ensureHydrated();
  const [orders, site] = await Promise.all([getOrders(), getSite()]);
  const settings = site.settings;
  const rules = settings.discountRules;

  const lines = input.lines.map((l) => {
    const p = products.find((x) => x.slug === l.slug);
    if (!p) throw new Error(`محصول ${l.slug} یافت نشد`);
    if (l.qty < p.limit) throw new Error(`حداقل سفارش «${p.name}» ${p.limit} ${p.unit} است`);
    if (l.qty > p.meters) throw new Error(`فقط ${p.meters} ${p.unit} از «${p.name}» موجود است`);
    // same resolver the storefront uses (lib/pricing.ts) — sale price + discount rules
    const unitPrice = priceOf(p, rules, l.qty).unit;
    return { slug: p.slug, name: p.name, image: p.image, unit: p.unit, qty: l.qty, unitPrice, lineTotal: Math.round(unitPrice * l.qty), note: l.note } as OrderLine;
  });
  if (lines.length === 0) throw new Error("سفارش بدون قلم");
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  const createdAt = now();
  const events: OrderEvent[] = [
    { at: createdAt, type: "created", text: input.source === "manual" ? "سفارش دستی ثبت شد" : "سفارش از سایت ثبت شد", by: input.source === "manual" ? ACTOR : "سیستم" },
  ];

  // discounts: cart tiers → coupon → referral → manual (staff) discount
  let discount = 0;
  const tier = cartTierDiscount(subtotal, rules);
  if (tier.toman > 0) {
    discount += tier.toman;
    events.push({ at: createdAt, type: "edit", text: `${tier.label}: ${faN(tier.toman)} تومان`, by: "سیستم" });
  }
  let couponCode: string | undefined;
  let freeShippingCoupon = false;
  if (input.couponCode) {
    const c = await checkCoupon(input.couponCode, subtotal - discount);
    if (!c.ok) throw new Error(c.message);
    couponCode = c.coupon.code;
    discount += c.discountToman;
    freeShippingCoupon = c.coupon.kind === "free_shipping";
    events.push({ at: createdAt, type: "edit", text: `کد تخفیف ${c.coupon.code}: ${c.label}`, by: "سیستم" });
    await saveSettings("coupons", settings.coupons.map((x) => (x.code === c.coupon.code ? { ...x, used: x.used + 1 } : x)));
  }
  let referrerPhone: string | undefined;
  if (input.customer.referral && settings.referral.enabled) {
    const code = input.customer.referral.trim().toUpperCase();
    const referrer = (await getCustomers()).find((cu) => referralCodeFor(cu.phone) === code && cu.phone !== input.customer.phone);
    const isFirst = !orders.some((o) => o.customer.phone === input.customer.phone && counts(o));
    if (referrer && (!settings.referral.firstOrderOnly || isFirst)) {
      const r = settings.referral.refereeReward;
      const off = r.kind === "percent" ? Math.round(((subtotal - discount) * r.value) / 100) : Math.min(r.value, subtotal - discount);
      discount += off;
      referrerPhone = referrer.phone;
      events.push({ at: createdAt, type: "edit", text: `کد معرف ${code} (${referrer.name}): ${faN(off)} تومان تخفیف`, by: "سیستم" });
    }
  }
  discount += Math.min(subtotal - discount, Math.max(0, input.discount ?? 0));
  discount = Math.min(subtotal, discount);

  const goods = subtotal - discount;
  const meters = lines.reduce((s, l) => s + (l.unit === "متر" ? l.qty : 0), 0);
  const methodPrice = settings.delivery.methods.find((m) => m.active)?.priceToman ?? 0;
  const shipping =
    input.delivery.type === "pickup" || freeShippingCoupon
      ? 0
      : shippingFor(
          {
            subtotal: goods,
            meters,
            lines: lines.map((l) => ({ product: products.find((p) => p.slug === l.slug)!, qty: l.qty })),
            province: input.delivery.type === "post" ? input.delivery.province : undefined,
            methodPrice,
          },
          settings.shipping,
        ).fee;
  const total = goods + shipping;
  const cod = input.delivery.type === "pickup" && input.delivery.cod;
  const paid = !!input.markPaid || input.paymentMethod === "zarinpal"; // no gateway yet: web payments are simulated as successful
  const status: OrderStatus = cod ? "preparing" : paid ? "paid" : "pending_payment";
  const key = nextKey(orders);
  if (paid && !cod)
    events.push({
      at: createdAt,
      type: "status",
      text: input.paymentMethod === "zarinpal" ? "پرداخت (شبیه‌سازی‌شده — درگاه هنوز متصل نیست) تایید شد" : `پرداخت ${input.paymentMethod === "cash" ? "نقدی" : "کارت‌به‌کارت"} ثبت شد${input.paymentRef ? ` — مرجع ${input.paymentRef}` : ""}`,
      by: input.source === "manual" ? ACTOR : "سیستم",
    });
  if (cod) events.push({ at: createdAt, type: "status", text: "پرداخت در محل — مستقیم به آماده‌سازی", by: "سیستم" });

  const order: Order = {
    key,
    createdAt,
    status,
    paymentStatus: cod ? "cod_pending" : paid ? "paid" : "unpaid",
    paymentMethod: input.paymentMethod,
    paymentRef: input.paymentRef,
    paidAt: paid && !cod ? createdAt : undefined,
    customer: input.customer,
    delivery: input.delivery,
    lines,
    subtotal,
    discount,
    couponCode,
    shipping,
    total,
    customerNote: input.customerNote,
    internalNotes: [],
    events,
    source: input.source,
  };

  // stock: reserved at creation, deducted on paid (§4.2.3) — without a gateway
  // round-trip the two collapse into one deduction here
  if (status !== "pending_payment") await deductStock(order, -1);

  await saveOrder(order);

  // referrer reward (§4.11.7) — wallet credit on the referrer's customer record
  if (referrerPhone && settings.referral.referrerReward.kind === "wallet") {
    const meta = await getCustomerMeta(referrerPhone);
    await saveCustomerMeta(referrerPhone, {
      ...meta,
      walletToman: meta.walletToman + settings.referral.referrerReward.value,
      notes: [...meta.notes, `پاداش معرفی: +${faN(settings.referral.referrerReward.value)} تومان (سفارش ${orderNumber(key)})`],
    });
  }

  const tpl = settings.sms.templates.find((t) => t.event === "paid");
  if (status !== "pending_payment" && tpl?.enabled) await logSms(order.customer.phone, order.key, "auto", "paid", tpl.text.replace("{order}", orderNumber(key)));
  await audit({ action: "ثبت سفارش", entity: "order", entityId: key, summary: `${order.customer.name} · ${total.toLocaleString("en-US")}` });
  return order;
}

/** «ویرایش اقلام» — §4.2.2: while pending/paid, change metres, remove or add lines with a reason. */
export async function editOrderLines(key: string, newLines: { slug: string; qty: number; note?: string }[], reason: string) {
  await ensureHydrated();
  const order = await getOrder(key);
  if (!order) throw new Error("سفارش یافت نشد");
  if (!["pending_payment", "paid", "preparing"].includes(order.status)) throw new Error("فقط سفارش‌های پرداخت‌شده یا در حال آماده‌سازی قابل ویرایش‌اند");
  if (!reason.trim()) throw new Error("دلیل ویرایش الزامی است");
  if (newLines.length === 0) throw new Error("سفارش نمی‌تواند بدون قلم باشد — به جای آن لغو کنید");

  const rules = (await getSite()).settings.discountRules;
  const held = order.status !== "pending_payment";
  // return the old quantities to stock before validating the new ones
  if (held) await deductStock(order, 1);
  const lines: OrderLine[] = [];
  try {
    for (const l of newLines) {
      const p = products.find((x) => x.slug === l.slug);
      if (!p) throw new Error(`محصول ${l.slug} یافت نشد`);
      if (l.qty < p.limit) throw new Error(`حداقل سفارش «${p.name}» ${p.limit} ${p.unit} است`);
      if (l.qty > p.meters) throw new Error(`فقط ${p.meters} ${p.unit} از «${p.name}» موجود است`);
      const unitPrice = priceOf(p, rules, l.qty).unit;
      lines.push({ slug: p.slug, name: p.name, image: p.image, unit: p.unit, qty: l.qty, unitPrice, lineTotal: Math.round(unitPrice * l.qty), note: l.note });
    }
  } catch (e) {
    if (held) await deductStock(order, -1);
    throw e;
  }
  const before = order.total;
  order.lines = lines;
  order.subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  order.discount = Math.min(order.subtotal, order.discount);
  order.total = order.subtotal - order.discount + order.shipping;
  if (held) await deductStock(order, -1);
  const diff = before - order.total;
  order.events.push({ at: now(), type: "edit", text: `اقلام ویرایش شد — ${reason}${diff !== 0 ? ` · مبلغ ${diff > 0 ? "کمتر" : "بیشتر"} شد: ${faN(Math.abs(diff))} تومان` : ""}`, by: ACTOR });
  if (diff > 0 && order.paymentStatus === "paid") {
    const meta = await getCustomerMeta(order.customer.phone);
    await saveCustomerMeta(order.customer.phone, { ...meta, walletToman: meta.walletToman + diff, notes: [...meta.notes, `مابه‌التفاوت سفارش ${orderNumber(key)}: +${faN(diff)} تومان`] });
    order.events.push({ at: now(), type: "refund", text: `مابه‌التفاوت ${faN(diff)} تومان به کیف پول مشتری برگشت`, by: ACTOR });
    order.paymentStatus = "partially_refunded";
  }
  await saveOrder(order);
  await audit({ action: "ویرایش اقلام سفارش", entity: "order", entityId: key, summary: reason });
  return order;
}

async function deductStock(order: Order, sign: 1 | -1) {
  await ensureHydrated();
  const touched: Product[] = [];
  for (const l of order.lines) {
    const p = products.find((x) => x.slug === l.slug);
    if (!p) continue;
    p.meters = Math.max(0, Math.round((p.meters + sign * l.qty) * 100) / 100);
    touched.push(p);
  }
  const db = supabaseAdmin();
  const results = await Promise.all(touched.map((p) => db.from("products").update({ meters: p.meters, updated_at: now() }).eq("id", p.id)));
  results.forEach((r) => check(r));
}

export async function setOrderStatus(key: string, to: OrderStatus, opts: { trackingCode?: string; carrier?: string; reason?: string; force?: boolean } = {}) {
  const order = await getOrder(key);
  if (!order) throw new Error("سفارش یافت نشد");
  const from = order.status;
  if (from === to) return order;
  if (!transitions[from].includes(to) && !opts.force) throw new Error(`تغییر از «${statusMeta[from].label}» به «${statusMeta[to].label}» مجاز نیست`);
  if (to === "shipped") {
    if (order.delivery.type !== "post") throw new Error("سفارش حضوری ارسال پستی ندارد");
    if (!opts.trackingCode?.trim()) throw new Error("کد رهگیری الزامی است");
    order.delivery.trackingCode = opts.trackingCode.trim();
    if (opts.carrier) order.delivery.carrier = opts.carrier;
  }
  if ((to === "cancelled" || to === "returned") && !opts.reason?.trim()) throw new Error("دلیل الزامی است");

  const wasStockHeld = !["pending_payment", "failed", "cancelled", "returned"].includes(from);
  const willHold = !["pending_payment", "failed", "cancelled", "returned"].includes(to);
  if (!wasStockHeld && willHold) await deductStock(order, -1);
  if (wasStockHeld && !willHold) await deductStock(order, 1);

  order.status = to;
  if (to === "paid") {
    order.paymentStatus = "paid";
    order.paidAt = now();
  }
  if (to === "delivered" && order.paymentStatus === "cod_pending") order.paymentStatus = "paid";
  if (to === "cancelled" || to === "returned") {
    order.cancelReason = opts.reason;
    if (order.paymentStatus === "paid") order.paymentStatus = "refunded";
    if (order.paymentStatus === "cod_pending") order.paymentStatus = "unpaid";
  }
  order.events.push({
    at: now(),
    type: "status",
    text: `${statusMeta[from].label} ← ${statusMeta[to].label}${opts.reason ? ` — ${opts.reason}` : ""}${opts.trackingCode ? ` — کد رهگیری ${opts.trackingCode}` : ""}${opts.force ? " (بازگشت به عقب)" : ""}`,
    by: ACTOR,
  });

  // customer notifications — §4.2.4 (texts from Settings → پیامک)
  const tpl = (await getSite()).settings.sms.templates.find((t) => t.event === to && t.enabled);
  if (tpl) {
    const text = tpl.text
      .replace("{order}", orderNumber(order.key))
      .replace("{carrier}", order.delivery.type === "post" ? order.delivery.carrier : "")
      .replace("{tracking}", order.delivery.type === "post" ? order.delivery.trackingCode ?? "" : "")
      .replace("{day}", order.delivery.type === "pickup" ? order.delivery.day : "")
      .replace("{hour}", order.delivery.type === "pickup" ? order.delivery.hour : "")
      .replace("{amount}", order.total.toLocaleString("fa-IR"))
      .replace("{method}", "کیف پول");
    await logSms(order.customer.phone, order.key, "auto", to, text);
    order.events.push({ at: now(), type: "sms", text: `پیامک: ${text}`, by: "سیستم" });
  }

  await saveOrder(order);
  await audit({ action: "تغییر وضعیت سفارش", entity: "order", entityId: key, summary: `${statusMeta[from].label} ← ${statusMeta[to].label}` });
  return order;
}

export async function addOrderNote(key: string, text: string) {
  const order = await getOrder(key);
  if (!order) throw new Error("سفارش یافت نشد");
  order.internalNotes.push(text);
  order.events.push({ at: now(), type: "note", text, by: ACTOR });
  await saveOrder(order);
  await audit({ action: "یادداشت سفارش", entity: "order", entityId: key, summary: text.slice(0, 60) });
}

export async function sendOrderSms(key: string, text: string) {
  const order = await getOrder(key);
  if (!order) throw new Error("سفارش یافت نشد");
  const entry = await logSms(order.customer.phone, order.key, "single", "manual", text);
  order.events.push({ at: now(), type: "sms", text: `پیامک (${entry.status}): ${text}`, by: ACTOR });
  await saveOrder(order);
  return entry;
}

/* ---------------- customers (derived from orders + customer_meta) ---------------- */

export type CustomerMeta = { tags: string[]; notes: string[]; blocked: boolean; walletToman: number };

type MetaRow = { phone: string; tags: string[] | null; notes: string[] | null; blocked: boolean; wallet_toman: number };

const emptyMeta = (): CustomerMeta => ({ tags: [], notes: [], blocked: false, walletToman: 0 });
const rowToMeta = (r: MetaRow): CustomerMeta => ({ tags: r.tags ?? [], notes: r.notes ?? [], blocked: r.blocked, walletToman: r.wallet_toman });

export async function getCustomerMeta(phone: string): Promise<CustomerMeta> {
  const row = check<MetaRow>(await supabaseAdmin().from("customer_meta").select("*").eq("phone", phone).maybeSingle());
  return row ? rowToMeta(row) : emptyMeta();
}

export async function saveCustomerMeta(phone: string, meta: CustomerMeta) {
  check(
    await supabaseAdmin()
      .from("customer_meta")
      .upsert({ phone, tags: meta.tags, notes: meta.notes, blocked: meta.blocked, wallet_toman: meta.walletToman, updated_at: now() }),
  );
  await audit({ action: "ویرایش مشتری", entity: "customer", entityId: phone, summary: meta.tags.join("، ") });
}

export type CustomerSummary = {
  phone: string;
  name: string;
  city: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string;
  firstOrderAt: string;
  meta: CustomerMeta;
};

export async function getCustomers(): Promise<CustomerSummary[]> {
  const metaQuery = supabaseAdmin().from("customer_meta").select("*");
  const [orders, metaRes] = await Promise.all([getOrders(), metaQuery]);
  const metas = new Map(unwrap<MetaRow[]>(metaRes).map((r) => [r.phone, rowToMeta(r)]));
  const map = new Map<string, CustomerSummary>();
  for (const o of orders) {
    const cur = map.get(o.customer.phone);
    const counted = !["cancelled", "failed", "pending_payment"].includes(o.status);
    const city = o.delivery.type === "post" ? o.delivery.city : "حضوری";
    if (!cur) {
      map.set(o.customer.phone, {
        phone: o.customer.phone,
        name: o.customer.name,
        city,
        ordersCount: counted ? 1 : 0,
        totalSpent: counted ? o.total : 0,
        lastOrderAt: o.createdAt,
        firstOrderAt: o.createdAt,
        meta: metas.get(o.customer.phone) ?? emptyMeta(),
      });
    } else {
      if (counted) {
        cur.ordersCount++;
        cur.totalSpent += o.total;
      }
      if (o.createdAt < cur.firstOrderAt) cur.firstOrderAt = o.createdAt;
      if (o.createdAt > cur.lastOrderAt) {
        cur.lastOrderAt = o.createdAt;
        cur.name = o.customer.name;
      }
    }
  }
  return [...map.values()].sort((a, b) => (a.lastOrderAt < b.lastOrderAt ? 1 : -1));
}

/** Built-in customer segments — §4.11.5. Evaluated live over the orders. */
export type Segment = { name: string; definition: string; count: number; phones: string[] };

export async function getSegments(): Promise<Segment[]> {
  const customers = await getCustomers();
  const day = 86400000;
  const now = Date.now();
  const seg = (name: string, definition: string, pick: (c: CustomerSummary) => boolean): Segment => {
    const list = customers.filter(pick);
    return { name, definition, count: list.length, phones: list.map((c) => c.phone) };
  };
  return [
    seg("همه مشتریان", "هر شماره‌ای که سفارش داده", () => true),
    seg("مشتریان جدید", "اولین سفارش در ۳۰ روز اخیر", (c) => now - new Date(c.firstOrderAt).getTime() < 30 * day),
    seg("مشتریان وفادار", "۳ سفارش یا بیشتر", (c) => c.ordersCount >= 3),
    seg("غیرفعال ۹۰ روز", "بدون سفارش در ۹۰ روز اخیر", (c) => now - new Date(c.lastOrderAt).getTime() > 90 * day),
    seg("خیاط‌ها", "برچسب «خیاط»", (c) => c.meta.tags.includes("خیاط")),
    seg("تهران", "آخرین آدرس در تهران", (c) => c.city === "تهران"),
  ];
}

/** Totals for the SMS log header — §4.16.4. */
export async function smsStats() {
  const log = await getSmsLog();
  const now = Date.now();
  const day = 86400000;
  return {
    todayCost: log.filter((e) => now - new Date(e.at).getTime() < day).reduce((s, e) => s + e.costToman, 0),
    monthCost: log.filter((e) => now - new Date(e.at).getTime() < 30 * day).reduce((s, e) => s + e.costToman, 0),
    failed24: log.filter((e) => e.status === "failed" && now - new Date(e.at).getTime() < day).length,
  };
}

/* ---------------- reviews & contact messages — §4.10 ---------------- */

export type Review = {
  id: string;
  slug: string;
  productName: string;
  name: string;
  phone?: string;
  rating: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  reply?: string;
  verified: boolean;
  createdAt: string;
};

type ReviewRow = {
  id: string;
  slug: string;
  product_name: string;
  name: string;
  phone: string | null;
  rating: number | string;
  text: string;
  status: Review["status"];
  reply: string | null;
  verified: boolean;
  created_at: string;
};

const rowToReview = (r: ReviewRow): Review => ({
  id: r.id,
  slug: r.slug,
  productName: r.product_name,
  name: r.name,
  phone: r.phone ?? undefined,
  rating: Number(r.rating),
  text: r.text,
  status: r.status,
  reply: r.reply ?? undefined,
  verified: r.verified,
  createdAt: iso(r.created_at),
});

export async function getReviews(): Promise<Review[]> {
  const rows = unwrap<ReviewRow[]>(await supabaseAdmin().from("reviews").select("*").order("created_at", { ascending: false }));
  return rows.map(rowToReview);
}

export async function addReview(input: Omit<Review, "id" | "status" | "verified" | "createdAt" | "productName">) {
  await ensureHydrated();
  const p = products.find((x) => x.slug === input.slug);
  if (!p) throw new Error("محصول یافت نشد");
  const [site, orders] = await Promise.all([getSite(), getOrders()]);
  const verified = !!input.phone && orders.some((o) => o.customer.phone === input.phone && o.lines.some((l) => l.slug === input.slug) && o.status === "delivered");
  const review: Review = {
    id: "r" + Date.now(),
    ...input,
    productName: p.name,
    status: verified && site.settings.reviews.autoApproveVerified ? "approved" : "pending",
    verified,
    createdAt: now(),
  };
  check(
    await supabaseAdmin().from("reviews").insert({
      id: review.id,
      slug: review.slug,
      product_name: review.productName,
      name: review.name,
      phone: review.phone ?? null,
      rating: review.rating,
      text: review.text,
      status: review.status,
      reply: review.reply ?? null,
      verified: review.verified,
      created_at: review.createdAt,
    }),
  );
  return review;
}

export async function moderateReview(id: string, patch: Partial<Pick<Review, "status" | "reply">>) {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.reply !== undefined) row.reply = patch.reply;
  const updated = unwrap<{ id: string }[]>(await supabaseAdmin().from("reviews").update(row).eq("id", id).select("id"));
  if (updated.length === 0) throw new Error("دیدگاه یافت نشد");
  await audit({ action: patch.reply !== undefined ? "پاسخ به دیدگاه" : "بازبینی دیدگاه", entity: "review", entityId: id, summary: patch.status ?? "" });
}

export async function approvedReviewsFor(slug: string): Promise<Review[]> {
  const rows = unwrap<ReviewRow[]>(
    await supabaseAdmin().from("reviews").select("*").eq("slug", slug).eq("status", "approved").order("created_at", { ascending: false }),
  );
  return rows.map(rowToReview);
}

/* ---------------- product questions — §4.10 «پرسش‌ها» ---------------- */

export type Question = {
  id: string;
  slug: string;
  productName: string;
  name: string;
  phone?: string;
  text: string;
  answer?: string;
  status: "pending" | "answered" | "rejected";
  createdAt: string;
  answeredAt?: string;
};

type QuestionRow = {
  id: string;
  slug: string;
  product_name: string;
  name: string;
  phone: string | null;
  text: string;
  answer: string | null;
  status: Question["status"];
  created_at: string;
  answered_at: string | null;
};

const rowToQuestion = (r: QuestionRow): Question => ({
  id: r.id,
  slug: r.slug,
  productName: r.product_name,
  name: r.name,
  phone: r.phone ?? undefined,
  text: r.text,
  answer: r.answer ?? undefined,
  status: r.status,
  createdAt: iso(r.created_at),
  answeredAt: r.answered_at ? iso(r.answered_at) : undefined,
});

export async function getQuestions(): Promise<Question[]> {
  const rows = unwrap<QuestionRow[]>(await supabaseAdmin().from("questions").select("*").order("created_at", { ascending: false }));
  return rows.map(rowToQuestion);
}

export async function addQuestion(input: { slug: string; name: string; phone?: string; text: string }) {
  await ensureHydrated();
  const p = products.find((x) => x.slug === input.slug);
  if (!p) throw new Error("محصول یافت نشد");
  check(
    await supabaseAdmin().from("questions").insert({
      id: "q" + Date.now(),
      slug: input.slug,
      product_name: p.name,
      name: input.name || "مشتری",
      phone: input.phone ?? null,
      text: input.text,
      status: "pending",
      created_at: now(),
    }),
  );
}

export async function answerQuestion(id: string, patch: { answer?: string; status?: Question["status"] }) {
  const db = supabaseAdmin();
  const q = check<QuestionRow>(await db.from("questions").select("*").eq("id", id).maybeSingle());
  if (!q) throw new Error("پرسش یافت نشد");
  const row: Record<string, unknown> = {};
  if (patch.answer !== undefined) {
    row.answer = patch.answer;
    row.answered_at = now();
    row.status = "answered";
  }
  if (patch.status) row.status = patch.status;
  check(await db.from("questions").update(row).eq("id", id));
  await audit({ action: "پاسخ به پرسش", entity: "question", entityId: id, summary: q.product_name });
}

export async function answeredQuestionsFor(slug: string): Promise<Question[]> {
  const rows = unwrap<QuestionRow[]>(
    await supabaseAdmin().from("questions").select("*").eq("slug", slug).eq("status", "answered").order("created_at", { ascending: false }),
  );
  return rows.map(rowToQuestion);
}

/* ---------------- notifications — §4.15 ---------------- */

export type Notification = { id: string; event: string; title: string; text: string; href: string; at: string; tone: "purple" | "warn" | "danger" | "info" };

type NotifRow = { id: boolean; read_ids: string[] | null; read_all_at: string | null };

/** Events derived from the live stores; read state is the only thing persisted. */
export async function getNotifications(): Promise<{ items: (Notification & { read: boolean })[]; unread: number }> {
  await ensureHydrated();
  const [site, stateRes, orders, reviews, questions, messages, smsLog] = await Promise.all([
    getSite(),
    supabaseAdmin().from("notification_state").select("*").eq("id", true).maybeSingle(),
    getOrders(),
    getReviews(),
    getQuestions(),
    getMessages(),
    getSmsLog(),
  ]);
  const state = check<NotifRow>(stateRes);
  const readIds = state?.read_ids ?? [];
  const prefs = site.settings.notificationPrefs;
  const items: Notification[] = [];
  const day = 86400000;
  const cutoff = Date.now() - 7 * day;
  for (const o of orders) {
    if (new Date(o.createdAt).getTime() < cutoff) continue;
    if (o.status === "paid") items.push({ id: `order:${o.key}:paid`, event: "order_paid", title: `سفارش جدید ${orderNumber(o.key)}`, text: `${o.customer.name} · ${faN(o.total)} تومان`, href: `/admin/orders/${o.key}`, at: o.createdAt, tone: "purple" });
    if (o.status === "failed") items.push({ id: `order:${o.key}:failed`, event: "order_failed", title: `پرداخت ناموفق ${orderNumber(o.key)}`, text: o.customer.name, href: `/admin/orders/${o.key}`, at: o.createdAt, tone: "danger" });
    if (o.status === "ready_for_pickup") items.push({ id: `order:${o.key}:pickup`, event: "order_paid", title: `آماده تحویل حضوری ${orderNumber(o.key)}`, text: o.delivery.type === "pickup" ? `${o.delivery.day} ساعت ${o.delivery.hour}` : "", href: `/admin/orders/${o.key}`, at: o.createdAt, tone: "warn" });
  }
  // low stock: one row per product up to three, otherwise a single grouped row —
  // a dozen stock rows must not bury the new orders (dated 1 day back so orders sort first)
  const low = products.filter((x) => x.meters > 0 && x.meters <= 2);
  const lowAt = new Date(Date.now() - day).toISOString();
  if (low.length > 3) items.push({ id: `stock:group:${low.length}`, event: "low_stock", title: `${faN(low.length)} پارچه با موجودی کم`, text: low.slice(0, 3).map((p) => p.name).join("، ") + " و…", href: "/admin/products?stock=low", at: lowAt, tone: "warn" });
  else for (const p of low) items.push({ id: `stock:${p.slug}:${p.meters}`, event: "low_stock", title: "موجودی کم", text: `«${p.name}» به ${faN(p.meters)} ${p.unit} رسید`, href: `/admin/products/${p.slug}`, at: lowAt, tone: "warn" });
  for (const r of reviews.filter((x) => x.status === "pending")) items.push({ id: `review:${r.id}`, event: "review", title: "دیدگاه جدید", text: `${r.name} درباره «${r.productName}»`, href: "/admin/reviews", at: r.createdAt, tone: "info" });
  for (const q of questions.filter((x) => x.status === "pending")) items.push({ id: `question:${q.id}`, event: "question", title: "پرسش جدید", text: `${q.name} درباره «${q.productName}»`, href: "/admin/reviews?tab=questions", at: q.createdAt, tone: "info" });
  for (const m of messages.filter((x) => x.status === "new")) items.push({ id: `message:${m.id}`, event: "message", title: "پیام تماس", text: `${m.name}: ${m.text.slice(0, 60)}`, href: "/admin/reviews?tab=messages", at: m.createdAt, tone: "info" });
  for (const s of smsLog.filter((x) => x.status === "failed").slice(0, 5)) items.push({ id: `sms:${s.id}`, event: "integration", title: "خطای پیامک", text: s.phone, href: "/admin/sms?tab=log", at: s.at, tone: "danger" });
  const health = integrationHealth(site.settings);
  if (!health.gateway || !health.sms) items.push({ id: `integration:${health.gateway}:${health.sms}`, event: "integration", title: "درگاه پرداخت / پیامک متصل نیست", text: "کلیدها را در تنظیمات → اتصال‌ها وارد کنید", href: "/admin/settings/integrations", at: new Date(Date.now() - 2 * day).toISOString(), tone: "danger" });

  const readAll = state?.read_all_at ? new Date(state.read_all_at).getTime() : 0;
  const visible = items
    .filter((n) => prefs[n.event]?.inApp !== false)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .map((n) => ({ ...n, read: readIds.includes(n.id) || new Date(n.at).getTime() <= readAll }));
  return { items: visible, unread: visible.filter((n) => !n.read).length };
}

export async function markNotificationsRead(ids?: string[]) {
  const db = supabaseAdmin();
  const cur = check<NotifRow>(await db.from("notification_state").select("*").eq("id", true).maybeSingle());
  const readIds = cur?.read_ids ?? [];
  const next = ids
    ? { read_ids: [...new Set([...readIds, ...ids])].slice(-500), read_all_at: cur?.read_all_at ?? null }
    : { read_ids: readIds, read_all_at: now() };
  check(await db.from("notification_state").upsert({ id: true, ...next }));
}

export type ContactMessage = { id: string; name: string; phone: string; text: string; status: "new" | "read" | "done"; createdAt: string };

type MessageRow = { id: string; name: string; phone: string | null; text: string; status: ContactMessage["status"]; created_at: string };

export async function getMessages(): Promise<ContactMessage[]> {
  const rows = unwrap<MessageRow[]>(await supabaseAdmin().from("contact_messages").select("*").order("created_at", { ascending: false }));
  return rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone ?? "", text: r.text, status: r.status, createdAt: iso(r.created_at) }));
}

export async function addMessage(input: Pick<ContactMessage, "name" | "phone" | "text">) {
  check(await supabaseAdmin().from("contact_messages").insert({ id: "m" + Date.now(), ...input, status: "new", created_at: now() }));
}

export async function setMessageStatus(id: string, status: ContactMessage["status"]) {
  const updated = unwrap<{ id: string }[]>(await supabaseAdmin().from("contact_messages").update({ status }).eq("id", id).select("id"));
  if (updated.length === 0) throw new Error("پیام یافت نشد");
}

/* ---------------- SMS log — §4.16.4 ---------------- */

export type SmsEntry = {
  id: string;
  at: string;
  phone: string;
  orderKey?: string;
  kind: "otp" | "auto" | "mass" | "single";
  template: string;
  text: string;
  status: "delivered" | "queued" | "failed" | "simulated";
  costToman: number;
  line: "service" | "promo";
};

type SmsRow = {
  id: string;
  at: string;
  phone: string;
  order_key: string | null;
  kind: SmsEntry["kind"];
  template: string;
  text: string;
  status: SmsEntry["status"];
  cost_toman: number;
  line: SmsEntry["line"];
};

export async function getSmsLog(): Promise<SmsEntry[]> {
  const rows = unwrap<SmsRow[]>(await supabaseAdmin().from("sms_log").select("*").order("at", { ascending: false }).limit(2000));
  return rows.map((r) => ({
    id: r.id,
    at: iso(r.at),
    phone: r.phone,
    orderKey: r.order_key ?? undefined,
    kind: r.kind,
    template: r.template,
    text: r.text,
    status: r.status,
    costToman: r.cost_toman,
    line: r.line,
  }));
}

export async function logSms(phone: string, orderKey: string | undefined, kind: SmsEntry["kind"], template: string, text: string): Promise<SmsEntry> {
  const site = await getSite();
  const connected = integrationHealth(site.settings).sms;
  const segments = Math.max(1, Math.ceil(text.length / 70));
  const entry: SmsEntry = {
    id: "s" + Date.now() + Math.random().toString(36).slice(2, 6),
    at: now(),
    phone,
    orderKey,
    kind,
    template,
    text,
    // without a Kavenegar key nothing really leaves the server — the log says so
    status: connected ? "queued" : "simulated",
    costToman: segments * 1200,
    line: kind === "mass" ? "promo" : "service",
  };
  check(
    await supabaseAdmin().from("sms_log").insert({
      id: entry.id,
      at: entry.at,
      phone: entry.phone,
      order_key: entry.orderKey ?? null,
      kind: entry.kind,
      template: entry.template,
      text: entry.text,
      status: entry.status,
      cost_toman: entry.costToman,
      line: entry.line,
    }),
  );
  return entry;
}

/* ---------------- dashboard numbers — §4.1, real ---------------- */

export type Period = "today" | "7d" | "30d" | "month";

function periodRange(p: Period, now = new Date()): { from: number; to: number; prevFrom: number } {
  const to = now.getTime();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const day = 86400000;
  if (p === "today") return { from: startToday.getTime(), to, prevFrom: startToday.getTime() - day };
  if (p === "7d") return { from: to - 7 * day, to, prevFrom: to - 14 * day };
  if (p === "30d") return { from: to - 30 * day, to, prevFrom: to - 60 * day };
  // Jalali month start
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { day: "numeric" }).formatToParts(now);
  const dayOfMonth = Number(parts.find((x) => x.type === "day")?.value ?? "1");
  const from = startToday.getTime() - (dayOfMonth - 1) * day;
  return { from, to, prevFrom: from - 30 * day };
}

const counts = (o: Order) => !["pending_payment", "failed", "cancelled"].includes(o.status);

export async function kpisFor(period: Period) {
  const orders = (await getOrders()).filter(counts);
  const { from, to, prevFrom } = periodRange(period);
  const inRange = (o: Order, a: number, b: number) => {
    const t = new Date(o.createdAt).getTime();
    return t >= a && t < b;
  };
  const cur = orders.filter((o) => inRange(o, from, to));
  const prev = orders.filter((o) => inRange(o, prevFrom, from));
  const sum = (list: Order[]) => list.reduce((s, o) => s + o.total, 0);
  const meters = (list: Order[]) => list.reduce((s, o) => s + metersOf(o), 0);
  const pct = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : Math.round(((a - b) / b) * 100));
  const buckets = 7;
  const step = (to - from) / buckets;
  const spark = (f: (list: Order[]) => number) =>
    Array.from({ length: buckets }, (_, i) => f(cur.filter((o) => inRange(o, from + i * step, from + (i + 1) * step))));
  const avg = (list: Order[]) => (list.length ? Math.round(sum(list) / list.length) : 0);
  return {
    orders: cur.length,
    salesToman: sum(cur),
    avgBasketToman: avg(cur),
    metersSold: Math.round(meters(cur) * 10) / 10,
    deltaPct: { orders: pct(cur.length, prev.length), sales: pct(sum(cur), sum(prev)), avgBasket: pct(avg(cur), avg(prev)), meters: pct(meters(cur), meters(prev)) },
    spark: { orders: spark((l) => l.length), sales: spark(sum), avgBasket: spark(avg), meters: spark(meters) },
  };
}

export async function bestSellersFor(period: Period, limit = 5) {
  await ensureHydrated();
  const { from, to } = periodRange(period);
  const sold = new Map<string, number>();
  for (const o of (await getOrders()).filter(counts)) {
    const t = new Date(o.createdAt).getTime();
    if (t < from || t >= to) continue;
    for (const l of o.lines) sold.set(l.slug, (sold.get(l.slug) ?? 0) + l.qty);
  }
  return [...sold.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, qty]) => ({ slug, metersSold: Math.round(qty * 10) / 10, product: products.find((p) => p.slug === slug) }))
    .filter((x): x is { slug: string; metersSold: number; product: Product } => !!x.product);
}
