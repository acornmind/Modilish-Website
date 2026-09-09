"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "./orders";
import {
  addMessage,
  addOrderNote,
  addQuestion,
  addReview,
  answerQuestion,
  createOrder,
  editOrderLines,
  getCustomers,
  getOrders,
  logSms,
  markNotificationsRead,
  moderateReview,
  saveCustomerMeta,
  sendOrderSms,
  setMessageStatus,
  setOrderStatus,
  type CustomerMeta,
  type NewOrderInput,
} from "./orderStore";
import { products } from "./products";
import { ensureHydrated } from "./productStore";
import { getSite } from "./siteStore";
import { orderNumber } from "./orders";

export async function editOrderLinesAction(key: string, lines: { slug: string; qty: number; note?: string }[], reason: string) {
  await editOrderLines(key, lines, reason);
  revalidateOrders(key);
}

export async function submitQuestionAction(input: { slug: string; name: string; phone?: string; text: string }) {
  if (input.text.trim().length < 5) throw new Error("متن پرسش کوتاه است");
  await addQuestion({ ...input, text: input.text.trim(), name: input.name.trim() });
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
}

export async function answerQuestionAction(id: string, patch: { answer?: string; status?: "pending" | "answered" | "rejected" }) {
  await answerQuestion(id, patch);
  revalidatePath("/admin/reviews");
  revalidatePath("/", "layout");
}

export async function markNotificationsReadAction(ids?: string[]) {
  await markNotificationsRead(ids);
  revalidatePath("/admin", "layout");
}

export type SearchHit = { group: "orders" | "products" | "customers" | "posts" | "pages"; title: string; subtitle: string; href: string };

/** ⌘K global search — orders, products, customers, posts, pages (§3.2). */
export async function globalSearchAction(q: string): Promise<SearchHit[]> {
  const needle = q.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  if (needle.length < 2) return [];
  await ensureHydrated();
  const [orders, customers, site] = await Promise.all([getOrders(), getCustomers(), getSite()]);
  const hits: SearchHit[] = [];
  const has = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).includes(needle);
  for (const o of orders) {
    if (hits.filter((h) => h.group === "orders").length >= 5) break;
    if (has(o.key) || has(o.customer.name) || has(o.customer.phone) || (o.delivery.type === "post" && has(o.delivery.trackingCode ?? "")))
      hits.push({ group: "orders", title: `سفارش ${orderNumber(o.key)}`, subtitle: `${o.customer.name} · ${o.total.toLocaleString("fa-IR")} تومان`, href: `/admin/orders/${o.key}` });
  }
  for (const p of products) {
    if (hits.filter((h) => h.group === "products").length >= 5) break;
    if (has(p.name) || has(p.slug) || has(p.category)) hits.push({ group: "products", title: p.name, subtitle: `کد ${p.slug} · ${p.category} · ${p.meters.toLocaleString("fa-IR")} ${p.unit}`, href: `/admin/products/${p.slug}` });
  }
  for (const c of customers) {
    if (hits.filter((h) => h.group === "customers").length >= 5) break;
    if (has(c.name) || has(c.phone)) hits.push({ group: "customers", title: c.name, subtitle: `${c.phone} · ${c.ordersCount.toLocaleString("fa-IR")} سفارش`, href: `/admin/customers/${c.phone}` });
  }
  for (const p of site.posts) {
    if (hits.filter((h) => h.group === "posts").length >= 3) break;
    if (has(p.title)) hits.push({ group: "posts", title: p.title, subtitle: "مجله", href: `/admin/magazine/${encodeURIComponent(p.slug)}` });
  }
  for (const p of site.pages) {
    if (hits.filter((h) => h.group === "pages").length >= 3) break;
    if (has(p.title)) hits.push({ group: "pages", title: p.title, subtitle: "صفحه", href: `/admin/pages/${encodeURIComponent(p.slug)}` });
  }
  return hits;
}

function revalidateOrders(key?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/customers");
  if (key) revalidatePath(`/admin/orders/${key}`);
  revalidatePath("/", "layout"); // stock changed
}

/** Storefront checkout → order (§8: "checkout creates Order"). */
export async function createOrderAction(input: NewOrderInput) {
  const order = await createOrder(input);
  revalidateOrders(order.key);
  return { key: order.key };
}

export async function setOrderStatusAction(key: string, to: OrderStatus, opts?: { trackingCode?: string; carrier?: string; reason?: string; force?: boolean }) {
  await setOrderStatus(key, to, opts);
  revalidateOrders(key);
}

export async function addOrderNoteAction(key: string, text: string) {
  if (!text.trim()) throw new Error("یادداشت خالی است");
  await addOrderNote(key, text.trim());
  revalidateOrders(key);
}

export async function sendOrderSmsAction(key: string, text: string) {
  if (!text.trim()) throw new Error("متن پیامک خالی است");
  const entry = await sendOrderSms(key, text.trim());
  revalidateOrders(key);
  revalidatePath("/admin/sms");
  return { status: entry.status };
}

/** Customer-side: orders for the phone verified at checkout. */
export async function ordersForPhoneAction(phone: string) {
  const p = phone.replace(/\D/g, "");
  return (await getOrders()).filter((o) => o.customer.phone.replace(/\D/g, "") === p || o.customer.phone.replace(/\D/g, "") === "0" + p);
}

export async function saveCustomerMetaAction(phone: string, meta: CustomerMeta) {
  await saveCustomerMeta(phone, meta);
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${phone}`);
}

export async function submitReviewAction(input: { slug: string; name: string; phone?: string; rating: number; text: string }) {
  if (input.text.trim().length < 5) throw new Error("متن دیدگاه کوتاه است");
  const r = await addReview({ ...input, text: input.text.trim(), name: input.name.trim() || "مشتری مدیلیش" });
  revalidatePath(`/product/${input.slug}`);
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  return { status: r.status };
}

export async function moderateReviewAction(id: string, patch: { status?: "approved" | "rejected" | "pending"; reply?: string }) {
  await moderateReview(id, patch);
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function submitContactAction(input: { name: string; phone: string; text: string }) {
  if (input.text.trim().length < 5) throw new Error("متن پیام کوتاه است");
  await addMessage({ name: input.name.trim(), phone: input.phone.trim(), text: input.text.trim() });
  revalidatePath("/admin/reviews");
}

export async function setMessageStatusAction(id: string, status: "new" | "read" | "done") {
  await setMessageStatus(id, status);
  revalidatePath("/admin/reviews");
}

/** Single / mass sends from the پیامک section — logged; real delivery needs Kavenegar (§4.16). */
export async function sendSmsAction(phones: string[], text: string, kind: "single" | "mass", template = "manual") {
  if (!text.trim()) throw new Error("متن پیامک خالی است");
  const clean = [...new Set(phones.map((p) => p.replace(/\D/g, "")).filter((p) => /^0?9\d{9}$/.test(p)))];
  if (clean.length === 0) throw new Error("گیرنده معتبری وجود ندارد");
  let status = "queued";
  for (const p of clean) status = (await logSms(p.startsWith("0") ? p : "0" + p, undefined, kind, template, text.trim())).status;
  revalidatePath("/admin/sms");
  return { count: clean.length, status };
}
