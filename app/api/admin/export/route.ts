import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { products } from "@/lib/products";
import { ensureHydrated } from "@/lib/productStore";
import { getSite, getAuditLog } from "@/lib/siteStore";
import { getCustomers, getMessages, getOrders, getQuestions, getReviews, getSmsLog } from "@/lib/orderStore";
import { attr } from "@/lib/taxonomy";

// Admin exports — §4.3.4 (products CSV, same columns the importer reads),
// §4.9 (customers), §4.2 (orders) and the full JSON backup (§4.14).
// Signed-in admins only.

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (header: string[], rows: unknown[][]) => "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

const stamp = () => new Date().toISOString().slice(0, 10);

export async function GET(req: Request) {
  if (!(await currentUser())) return new NextResponse("unauthorized", { status: 401 });
  const type = new URL(req.url).searchParams.get("type") ?? "all";
  ensureHydrated();

  const file = (name: string, body: string, mime: string) =>
    new NextResponse(body, { headers: { "content-type": `${mime}; charset=utf-8`, "content-disposition": `attachment; filename="${name}"` } });

  if (type === "products") {
    const header = ["code", "name", "material", "detail", "patterns", "stance", "width", "colors", "usages", "seasons", "price", "salePrice", "stock", "minOrder", "unit", "status", "image", "description"];
    const rows = products.map((p) => [
      p.slug, p.name, p.category, attr(p, "جنس") ?? "", attr(p, "طرح") ?? "", attr(p, "ایستایی") ?? "", attr(p, "عرض") ?? "", attr(p, "رنگ‌ها") ?? "", attr(p, "کاربرد") ?? "", attr(p, "زمان استفاده") ?? "",
      p.price, p.salePrice, p.meters, p.limit, p.unit, p.status ?? "published", p.image, p.description ?? "",
    ]);
    return file(`modilish-products-${stamp()}.csv`, csv(header, rows), "text/csv");
  }

  if (type === "orders") {
    const header = ["key", "createdAt", "status", "paymentStatus", "paymentMethod", "customer", "phone", "delivery", "province", "city", "carrier", "trackingCode", "items", "subtotal", "discount", "shipping", "total", "couponCode", "source"];
    const rows = getOrders().map((o) => [
      o.key, o.createdAt, o.status, o.paymentStatus, o.paymentMethod, o.customer.name, o.customer.phone,
      o.delivery.type, o.delivery.type === "post" ? o.delivery.province : "", o.delivery.type === "post" ? o.delivery.city : "", o.delivery.type === "post" ? o.delivery.carrier : "", o.delivery.type === "post" ? o.delivery.trackingCode ?? "" : "",
      o.lines.map((l) => `${l.name} × ${l.qty} ${l.unit}`).join(" | "), o.subtotal, o.discount, o.shipping, o.total, o.couponCode ?? "", o.source,
    ]);
    return file(`modilish-orders-${stamp()}.csv`, csv(header, rows), "text/csv");
  }

  if (type === "customers") {
    const header = ["name", "phone", "orders", "totalSpent", "firstOrderAt", "lastOrderAt", "city", "tags", "walletToman", "blocked"];
    const rows = getCustomers().map((c) => [c.name, c.phone, c.ordersCount, c.totalSpent, c.firstOrderAt, c.lastOrderAt, c.city, c.meta.tags.join("، "), c.meta.walletToman, c.meta.blocked ? "1" : "0"]);
    return file(`modilish-customers-${stamp()}.csv`, csv(header, rows), "text/csv");
  }

  // full backup — everything the admin can change, in one file
  const bundle = {
    exportedAt: new Date().toISOString(),
    site: getSite(),
    products,
    orders: getOrders(),
    reviews: getReviews(),
    questions: getQuestions(),
    messages: getMessages(),
    smsLog: getSmsLog(),
    audit: getAuditLog(),
  };
  return file(`modilish-backup-${stamp()}.json`, JSON.stringify(bundle, null, 2), "application/json");
}
