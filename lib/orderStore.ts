// Server-only persistence for orders, customer notes, reviews, contact
// messages and the SMS log (data/*.json). Never import from a "use client"
// file — this uses `fs`. Seeds a handful of sample orders on first read so
// the admin has something to work with before the first real checkout.
import fs from "node:fs";
import path from "node:path";
import { products } from "./products";
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

const DATA = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA, "orders.json");
const CUSTOMERS_FILE = path.join(DATA, "customers.json");
const REVIEWS_FILE = path.join(DATA, "reviews.json");
const MESSAGES_FILE = path.join(DATA, "messages.json");
const SMS_FILE = path.join(DATA, "sms-log.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}
function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const ACTOR = "مو (مالک)";
const now = () => new Date().toISOString();

/* ---------------- seed ---------------- */

function line(slug: string, qty: number, note?: string): OrderLine | null {
  const p = products.find((x) => x.slug === slug);
  if (!p) return null;
  const unitPrice = p.salePrice > 0 ? p.salePrice : p.price;
  return { slug, name: p.name, image: p.image, unit: p.unit, qty, unitPrice, lineTotal: Math.round(unitPrice * qty), note };
}

function seedOrders(): Order[] {
  ensureHydrated();
  const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  const mk = (
    key: string,
    ago: number,
    status: OrderStatus,
    customer: Order["customer"],
    delivery: Order["delivery"],
    lines: (OrderLine | null)[],
    extra: Partial<Order> = {},
  ): Order => {
    const ls = lines.filter((l): l is OrderLine => !!l);
    const subtotal = ls.reduce((s, l) => s + l.lineTotal, 0);
    const createdAt = minsAgo(ago);
    const paid = !["pending_payment", "failed"].includes(status);
    const cod = delivery.type === "pickup" && delivery.cod;
    const events: OrderEvent[] = [{ at: createdAt, type: "created", text: "سفارش از سایت ثبت شد", by: "سیستم" }];
    if (paid && !cod) events.push({ at: minsAgo(ago - 1), type: "status", text: "پرداخت تایید شد — پیامک ثبت سفارش ارسال شد", by: "زرین‌پال" });
    if (["preparing", "shipped", "ready_for_pickup", "delivered"].includes(status))
      events.push({ at: minsAgo(Math.max(1, ago - 60)), type: "status", text: `${statusMeta.preparing.label}`, by: ACTOR });
    if (["shipped", "delivered"].includes(status) && delivery.type === "post")
      events.push({ at: minsAgo(Math.max(1, ago - 120)), type: "sms", text: `پیامک ارسال شد: سفارش ${orderNumber(key)} با ${delivery.carrier} ارسال شد.`, by: "سیستم" });
    if (status === "delivered") events.push({ at: minsAgo(Math.max(1, ago - 600)), type: "status", text: statusMeta.delivered.label, by: ACTOR });
    if (status === "cancelled") events.push({ at: minsAgo(Math.max(1, ago - 30)), type: "status", text: "لغو شد — مشتری انصراف داد؛ مبلغ به کیف پول برگشت", by: ACTOR });
    return {
      key,
      createdAt,
      status,
      paymentStatus: status === "cancelled" ? "refunded" : cod ? (status === "delivered" ? "paid" : "cod_pending") : paid ? "paid" : "unpaid",
      paymentMethod: cod ? "cod" : "zarinpal",
      paymentRef: paid && !cod ? "A0000" + key.slice(-4) : undefined,
      paidAt: paid && !cod ? createdAt : undefined,
      customer,
      delivery,
      lines: ls,
      subtotal,
      discount: 0,
      shipping: 0,
      total: subtotal,
      internalNotes: [],
      events,
      source: "web",
      ...extra,
    };
  };
  const post = (recipient: string, mobile: string, province: string, city: string, address: string, carrier = "پست پیشتاز", trackingCode?: string): Order["delivery"] => ({
    type: "post", carrier, recipient, mobile, province, city, postcode: "1234567890", address, trackingCode,
  });
  const pickup = (day: string, hour: string, cod = false): Order["delivery"] => ({ type: "pickup", day, hour, cod });

  return [
    mk("1405-000131", 12, "paid", { name: "مریم احمدی", phone: "09123456789" }, post("مریم احمدی", "09123456789", "تهران", "تهران", "خیابان ولیعصر، کوچه شهید مهدوی، پلاک ۱۲، واحد ۳"), [line("1201", 2), line("1001", 1.5, "یک‌تکه بریده شود")], { customerNote: "لطفاً قبل از ارسال تماس بگیرید." }),
    mk("1405-000130", 45, "ready_for_pickup", { name: "سارا کریمی", phone: "09351122334" }, pickup("امروز", "۱۶ تا ۱۸"), [line("1206", 2)]),
    mk("1405-000129", 120, "shipped", { name: "نگار موسوی", phone: "09198877665" }, post("نگار موسوی", "09198877665", "اصفهان", "اصفهان", "خیابان چهارباغ بالا، کوچه ۱۴، پلاک ۸", "تیپاکس", "TPX-88213"), [line("1202", 1.5), line("1210", 2), line("1003", 1)]),
    mk("1405-000128", 180, "paid", { name: "الهام رضایی", phone: "09104455667" }, post("الهام رضایی", "09104455667", "تهران", "کرج", "بلوار طالقانی، پلاک ۴۵"), [line("1002", 1)]),
    mk("1405-000127", 300, "ready_for_pickup", { name: "پریسا نوری", phone: "09362233445" }, pickup("امروز", "۱۲ تا ۱۴", true), [line("1203", 3), line("1201", 3)]),
    mk("1405-000126", 60 * 27, "delivered", { name: "زهرا قاسمی", phone: "09127788990" }, post("زهرا قاسمی", "09127788990", "فارس", "شیراز", "خیابان زند، کوچه ۷", "پست پیشتاز", "RR123456789IR"), [line("1001", 0.5)]),
    mk("1405-000125", 60 * 32, "preparing", { name: "فاطمه یوسفی", phone: "09355566778" }, post("فاطمه یوسفی", "09355566778", "تهران", "تهران", "نارمک، خیابان گلبرگ، پلاک ۲۱", "پیک تهران"), [line("1210", 1.5), line("1206", 1.5)]),
    mk("1405-000124", 60 * 36, "delivered", { name: "مریم احمدی", phone: "09123456789" }, pickup("دیروز", "۹ تا ۱۲"), [line("1002", 2)]),
    mk("1405-000123", 60 * 52, "cancelled", { name: "کیانا صادقی", phone: "09191122334" }, post("کیانا صادقی", "09191122334", "خراسان رضوی", "مشهد", "بلوار وکیل‌آباد، پلاک ۱۰۰"), [line("1003", 1.5)], { cancelReason: "انصراف مشتری" }),
    mk("1405-000122", 60 * 60, "shipped", { name: "نگار موسوی", phone: "09198877665" }, post("نگار موسوی", "09198877665", "اصفهان", "اصفهان", "خیابان چهارباغ بالا، کوچه ۱۴، پلاک ۸", "تیپاکس", "TPX-88102"), [line("1201", 1), line("1202", 1.5)]),
  ];
}

/* ---------------- orders ---------------- */

export function getOrders(): Order[] {
  let orders = readJson<Order[] | null>(ORDERS_FILE, null);
  if (!orders) {
    orders = seedOrders();
    writeJson(ORDERS_FILE, orders);
  }
  return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getOrder(key: string) {
  return getOrders().find((o) => o.key === key);
}

function saveOrders(orders: Order[]) {
  writeJson(ORDERS_FILE, orders);
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

const faN = (n: number) => n.toLocaleString("fa-IR");

/** Validates a code against Settings → coupons for a given goods total. */
export function checkCoupon(code: string, cartTotalToman: number): CouponCheck {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return { ok: false, message: "کد تخفیف را وارد کنید." };
  const coupon = getSite().settings.coupons.find((c) => c.code.trim().toLowerCase() === normalized);
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

export function createOrder(input: NewOrderInput): Order {
  ensureHydrated();
  const orders = getOrders();
  const settings = getSite().settings;
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
    const c = checkCoupon(input.couponCode, subtotal - discount);
    if (!c.ok) throw new Error(c.message);
    couponCode = c.coupon.code;
    discount += c.discountToman;
    freeShippingCoupon = c.coupon.kind === "free_shipping";
    events.push({ at: createdAt, type: "edit", text: `کد تخفیف ${c.coupon.code}: ${c.label}`, by: "سیستم" });
    saveSettings("coupons", settings.coupons.map((x) => (x.code === c.coupon.code ? { ...x, used: x.used + 1 } : x)));
  }
  let referrerPhone: string | undefined;
  if (input.customer.referral && settings.referral.enabled) {
    const code = input.customer.referral.trim().toUpperCase();
    const referrer = getCustomers().find((cu) => referralCodeFor(cu.phone) === code && cu.phone !== input.customer.phone);
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
  if (status !== "pending_payment") deductStock(order, -1);

  orders.unshift(order);
  saveOrders(orders);

  // referrer reward (§4.11.7) — wallet credit on the referrer's customer record
  if (referrerPhone && settings.referral.referrerReward.kind === "wallet") {
    const meta = getCustomerMeta(referrerPhone);
    saveCustomerMeta(referrerPhone, {
      ...meta,
      walletToman: meta.walletToman + settings.referral.referrerReward.value,
      notes: [...meta.notes, `پاداش معرفی: +${faN(settings.referral.referrerReward.value)} تومان (سفارش ${orderNumber(key)})`],
    });
  }

  const tpl = settings.sms.templates.find((t) => t.event === "paid");
  if (status !== "pending_payment" && tpl?.enabled) logSms(order.customer.phone, order.key, "auto", "paid", tpl.text.replace("{order}", orderNumber(key)));
  audit({ action: "ثبت سفارش", entity: "order", entityId: key, summary: `${order.customer.name} · ${total.toLocaleString("en-US")}` });
  return order;
}

/** «ویرایش اقلام» — §4.2.2: while pending/paid, change metres, remove or add lines with a reason. */
export function editOrderLines(key: string, newLines: { slug: string; qty: number; note?: string }[], reason: string) {
  ensureHydrated();
  const orders = getOrders();
  const order = orders.find((o) => o.key === key);
  if (!order) throw new Error("سفارش یافت نشد");
  if (!["pending_payment", "paid", "preparing"].includes(order.status)) throw new Error("فقط سفارش‌های پرداخت‌شده یا در حال آماده‌سازی قابل ویرایش‌اند");
  if (!reason.trim()) throw new Error("دلیل ویرایش الزامی است");
  if (newLines.length === 0) throw new Error("سفارش نمی‌تواند بدون قلم باشد — به جای آن لغو کنید");

  const rules = getSite().settings.discountRules;
  const held = order.status !== "pending_payment";
  // return the old quantities to stock before validating the new ones
  if (held) deductStock(order, 1);
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
    if (held) deductStock(order, -1);
    throw e;
  }
  const before = order.total;
  order.lines = lines;
  order.subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  order.discount = Math.min(order.subtotal, order.discount);
  order.total = order.subtotal - order.discount + order.shipping;
  if (held) deductStock(order, -1);
  const diff = before - order.total;
  order.events.push({ at: now(), type: "edit", text: `اقلام ویرایش شد — ${reason}${diff !== 0 ? ` · مبلغ ${diff > 0 ? "کمتر" : "بیشتر"} شد: ${faN(Math.abs(diff))} تومان` : ""}`, by: ACTOR });
  if (diff > 0 && order.paymentStatus === "paid") {
    const meta = getCustomerMeta(order.customer.phone);
    saveCustomerMeta(order.customer.phone, { ...meta, walletToman: meta.walletToman + diff, notes: [...meta.notes, `مابه‌التفاوت سفارش ${orderNumber(key)}: +${faN(diff)} تومان`] });
    order.events.push({ at: now(), type: "refund", text: `مابه‌التفاوت ${faN(diff)} تومان به کیف پول مشتری برگشت`, by: ACTOR });
    order.paymentStatus = "partially_refunded";
  }
  saveOrders(orders);
  audit({ action: "ویرایش اقلام سفارش", entity: "order", entityId: key, summary: reason });
  return order;
}

function deductStock(order: Order, sign: 1 | -1) {
  const overrides = readJson<Record<string, Partial<(typeof products)[number]>>>(path.join(DATA, "product-overrides.json"), {});
  for (const l of order.lines) {
    const p = products.find((x) => x.slug === l.slug);
    if (!p) continue;
    p.meters = Math.max(0, Math.round((p.meters + sign * l.qty) * 100) / 100);
    overrides[p.slug] = { ...overrides[p.slug], meters: p.meters };
  }
  writeJson(path.join(DATA, "product-overrides.json"), overrides);
}

export function setOrderStatus(key: string, to: OrderStatus, opts: { trackingCode?: string; carrier?: string; reason?: string; force?: boolean } = {}) {
  const orders = getOrders();
  const order = orders.find((o) => o.key === key);
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
  if (!wasStockHeld && willHold) deductStock(order, -1);
  if (wasStockHeld && !willHold) deductStock(order, 1);

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
  const tpl = getSite().settings.sms.templates.find((t) => t.event === to && t.enabled);
  if (tpl) {
    const text = tpl.text
      .replace("{order}", orderNumber(order.key))
      .replace("{carrier}", order.delivery.type === "post" ? order.delivery.carrier : "")
      .replace("{tracking}", order.delivery.type === "post" ? order.delivery.trackingCode ?? "" : "")
      .replace("{day}", order.delivery.type === "pickup" ? order.delivery.day : "")
      .replace("{hour}", order.delivery.type === "pickup" ? order.delivery.hour : "")
      .replace("{amount}", order.total.toLocaleString("fa-IR"))
      .replace("{method}", "کیف پول");
    logSms(order.customer.phone, order.key, "auto", to, text);
    order.events.push({ at: now(), type: "sms", text: `پیامک: ${text}`, by: "سیستم" });
  }

  saveOrders(orders);
  audit({ action: "تغییر وضعیت سفارش", entity: "order", entityId: key, summary: `${statusMeta[from].label} ← ${statusMeta[to].label}` });
  return order;
}

export function addOrderNote(key: string, text: string) {
  const orders = getOrders();
  const order = orders.find((o) => o.key === key);
  if (!order) throw new Error("سفارش یافت نشد");
  order.internalNotes.push(text);
  order.events.push({ at: now(), type: "note", text, by: ACTOR });
  saveOrders(orders);
  audit({ action: "یادداشت سفارش", entity: "order", entityId: key, summary: text.slice(0, 60) });
}

export function sendOrderSms(key: string, text: string) {
  const orders = getOrders();
  const order = orders.find((o) => o.key === key);
  if (!order) throw new Error("سفارش یافت نشد");
  const entry = logSms(order.customer.phone, order.key, "single", "manual", text);
  order.events.push({ at: now(), type: "sms", text: `پیامک (${entry.status}): ${text}`, by: ACTOR });
  saveOrders(orders);
  return entry;
}

/* ---------------- customers (derived from orders + notes file) ---------------- */

export type CustomerMeta = { tags: string[]; notes: string[]; blocked: boolean; walletToman: number };

export function getCustomerMeta(phone: string): CustomerMeta {
  const all = readJson<Record<string, CustomerMeta>>(CUSTOMERS_FILE, {});
  return all[phone] ?? { tags: [], notes: [], blocked: false, walletToman: 0 };
}

export function saveCustomerMeta(phone: string, meta: CustomerMeta) {
  const all = readJson<Record<string, CustomerMeta>>(CUSTOMERS_FILE, {});
  all[phone] = meta;
  writeJson(CUSTOMERS_FILE, all);
  audit({ action: "ویرایش مشتری", entity: "customer", entityId: phone, summary: meta.tags.join("، ") });
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

export function getCustomers(): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();
  const metas = readJson<Record<string, CustomerMeta>>(CUSTOMERS_FILE, {});
  for (const o of getOrders()) {
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
        meta: metas[o.customer.phone] ?? { tags: [], notes: [], blocked: false, walletToman: 0 },
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

export function getSegments(): Segment[] {
  const customers = getCustomers();
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
export function smsStats() {
  const log = getSmsLog();
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

export function getReviews(): Review[] {
  return readJson<Review[]>(REVIEWS_FILE, []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addReview(input: Omit<Review, "id" | "status" | "verified" | "createdAt" | "productName">) {
  ensureHydrated();
  const p = products.find((x) => x.slug === input.slug);
  if (!p) throw new Error("محصول یافت نشد");
  const site = getSite();
  const verified = !!input.phone && getOrders().some((o) => o.customer.phone === input.phone && o.lines.some((l) => l.slug === input.slug) && o.status === "delivered");
  const review: Review = {
    id: "r" + Date.now(),
    ...input,
    productName: p.name,
    status: verified && site.settings.reviews.autoApproveVerified ? "approved" : "pending",
    verified,
    createdAt: now(),
  };
  const all = readJson<Review[]>(REVIEWS_FILE, []);
  all.push(review);
  writeJson(REVIEWS_FILE, all);
  return review;
}

export function moderateReview(id: string, patch: Partial<Pick<Review, "status" | "reply">>) {
  const all = readJson<Review[]>(REVIEWS_FILE, []);
  const r = all.find((x) => x.id === id);
  if (!r) throw new Error("دیدگاه یافت نشد");
  Object.assign(r, patch);
  writeJson(REVIEWS_FILE, all);
  audit({ action: patch.reply !== undefined ? "پاسخ به دیدگاه" : "بازبینی دیدگاه", entity: "review", entityId: id, summary: patch.status ?? "" });
}

export function approvedReviewsFor(slug: string) {
  return getReviews().filter((r) => r.slug === slug && r.status === "approved");
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

const QUESTIONS_FILE = path.join(DATA, "questions.json");

export function getQuestions(): Question[] {
  return readJson<Question[]>(QUESTIONS_FILE, []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addQuestion(input: { slug: string; name: string; phone?: string; text: string }) {
  ensureHydrated();
  const p = products.find((x) => x.slug === input.slug);
  if (!p) throw new Error("محصول یافت نشد");
  const all = readJson<Question[]>(QUESTIONS_FILE, []);
  all.push({ id: "q" + Date.now(), slug: input.slug, productName: p.name, name: input.name || "مشتری", phone: input.phone, text: input.text, status: "pending", createdAt: now() });
  writeJson(QUESTIONS_FILE, all);
}

export function answerQuestion(id: string, patch: { answer?: string; status?: Question["status"] }) {
  const all = readJson<Question[]>(QUESTIONS_FILE, []);
  const q = all.find((x) => x.id === id);
  if (!q) throw new Error("پرسش یافت نشد");
  if (patch.answer !== undefined) {
    q.answer = patch.answer;
    q.answeredAt = now();
    q.status = "answered";
  }
  if (patch.status) q.status = patch.status;
  writeJson(QUESTIONS_FILE, all);
  audit({ action: "پاسخ به پرسش", entity: "question", entityId: id, summary: q.productName });
}

export function answeredQuestionsFor(slug: string) {
  return getQuestions().filter((q) => q.slug === slug && q.status === "answered");
}

/* ---------------- notifications — §4.15 ---------------- */

export type Notification = { id: string; event: string; title: string; text: string; href: string; at: string; tone: "purple" | "warn" | "danger" | "info" };

const NOTIF_FILE = path.join(DATA, "notifications.json");

/** Events derived from the live stores; read state is the only thing persisted. */
export function getNotifications(): { items: (Notification & { read: boolean })[]; unread: number } {
  ensureHydrated();
  const site = getSite();
  const prefs = site.settings.notificationPrefs;
  const state = readJson<{ readIds: string[]; readAllAt?: string }>(NOTIF_FILE, { readIds: [] });
  const items: Notification[] = [];
  const day = 86400000;
  const cutoff = Date.now() - 7 * day;
  for (const o of getOrders()) {
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
  for (const r of getReviews().filter((x) => x.status === "pending")) items.push({ id: `review:${r.id}`, event: "review", title: "دیدگاه جدید", text: `${r.name} درباره «${r.productName}»`, href: "/admin/reviews", at: r.createdAt, tone: "info" });
  for (const q of getQuestions().filter((x) => x.status === "pending")) items.push({ id: `question:${q.id}`, event: "question", title: "پرسش جدید", text: `${q.name} درباره «${q.productName}»`, href: "/admin/reviews?tab=questions", at: q.createdAt, tone: "info" });
  for (const m of getMessages().filter((x) => x.status === "new")) items.push({ id: `message:${m.id}`, event: "message", title: "پیام تماس", text: `${m.name}: ${m.text.slice(0, 60)}`, href: "/admin/reviews?tab=messages", at: m.createdAt, tone: "info" });
  for (const s of getSmsLog().filter((x) => x.status === "failed").slice(0, 5)) items.push({ id: `sms:${s.id}`, event: "integration", title: "خطای پیامک", text: s.phone, href: "/admin/sms?tab=log", at: s.at, tone: "danger" });
  const health = integrationHealth(site.settings);
  if (!health.gateway || !health.sms) items.push({ id: `integration:${health.gateway}:${health.sms}`, event: "integration", title: "درگاه پرداخت / پیامک متصل نیست", text: "کلیدها را در تنظیمات → اتصال‌ها وارد کنید", href: "/admin/settings/integrations", at: new Date(Date.now() - 2 * day).toISOString(), tone: "danger" });

  const readAll = state.readAllAt ? new Date(state.readAllAt).getTime() : 0;
  const visible = items
    .filter((n) => prefs[n.event]?.inApp !== false)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .map((n) => ({ ...n, read: state.readIds.includes(n.id) || new Date(n.at).getTime() <= readAll }));
  return { items: visible, unread: visible.filter((n) => !n.read).length };
}

export function markNotificationsRead(ids?: string[]) {
  const state = readJson<{ readIds: string[]; readAllAt?: string }>(NOTIF_FILE, { readIds: [] });
  if (!ids) state.readAllAt = now();
  else state.readIds = [...new Set([...state.readIds, ...ids])].slice(-500);
  writeJson(NOTIF_FILE, state);
}

export type ContactMessage = { id: string; name: string; phone: string; text: string; status: "new" | "read" | "done"; createdAt: string };

export function getMessages(): ContactMessage[] {
  return readJson<ContactMessage[]>(MESSAGES_FILE, []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addMessage(input: Pick<ContactMessage, "name" | "phone" | "text">) {
  const all = readJson<ContactMessage[]>(MESSAGES_FILE, []);
  all.push({ id: "m" + Date.now(), ...input, status: "new", createdAt: now() });
  writeJson(MESSAGES_FILE, all);
}

export function setMessageStatus(id: string, status: ContactMessage["status"]) {
  const all = readJson<ContactMessage[]>(MESSAGES_FILE, []);
  const m = all.find((x) => x.id === id);
  if (!m) throw new Error("پیام یافت نشد");
  m.status = status;
  writeJson(MESSAGES_FILE, all);
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

export function getSmsLog(): SmsEntry[] {
  return readJson<SmsEntry[]>(SMS_FILE, []).sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function logSms(phone: string, orderKey: string | undefined, kind: SmsEntry["kind"], template: string, text: string): SmsEntry {
  const site = getSite();
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
  const all = readJson<SmsEntry[]>(SMS_FILE, []);
  all.push(entry);
  writeJson(SMS_FILE, all.slice(-2000));
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

export function kpisFor(period: Period) {
  const orders = getOrders().filter(counts);
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

export function bestSellersFor(period: Period, limit = 5) {
  ensureHydrated();
  const { from, to } = periodRange(period);
  const sold = new Map<string, number>();
  for (const o of getOrders().filter(counts)) {
    const t = new Date(o.createdAt).getTime();
    if (t < from || t >= to) continue;
    for (const l of o.lines) sold.set(l.slug, (sold.get(l.slug) ?? 0) + l.qty);
  }
  return [...sold.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, qty]) => ({ slug, metersSold: Math.round(qty * 10) / 10, product: products.find((p) => p.slug === slug) }))
    .filter((x): x is { slug: string; metersSold: number; product: (typeof products)[number] } => !!x.product);
}
