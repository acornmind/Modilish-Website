// One-off migration: data/*.json (+ the hardcoded lib/catalog.ts product
// list) -> Supabase tables defined in supabase/migrations/0001_init.sql.
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// .env.local (service_role bypasses RLS, which is why this only ever runs
// server-side / from a dev machine, never in the browser).
//
// Run with: npx tsx scripts/migrate-to-supabase.ts
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import { products, type Product } from "../lib/products";
import type { ProductPatch } from "../lib/productStore";
import type { Order } from "../lib/orders";
import type { AuditEntry } from "../lib/siteStore";
import type { Question } from "../lib/orderStore";
import type { SiteContent } from "../lib/siteContent";

config({ path: path.join(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key);

const DATA = path.join(process.cwd(), "data");
function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function migrateProducts() {
  // Reproduce productStore.ensureHydrated(): base catalog + new products,
  // minus deleted, with per-slug overrides applied.
  const created = readJson<Product[]>("new-products.json", []);
  const deleted = new Set(readJson<string[]>("deleted-products.json", []));
  const overrides = readJson<Record<string, ProductPatch>>("product-overrides.json", {});

  const merged = [...products, ...created.filter((p) => !products.some((x) => x.slug === p.slug))].filter(
    (p) => !deleted.has(p.slug),
  );
  for (const p of merged) {
    const patch = overrides[p.slug];
    if (patch) Object.assign(p, patch);
  }

  const rows = merged.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    sale_price: p.salePrice,
    meters: p.meters,
    limit_meters: p.limit,
    unit: p.unit,
    image: p.image,
    category: p.category,
    rating: p.rating,
    attributes: p.attributes,
    description: p.description,
    status: p.status ?? "published",
    video_url: p.videoUrl ?? "",
  }));

  const { error } = await supabase.from("products").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  console.log(`products: ${rows.length} upserted`);
}

async function migrateOrders() {
  const orders = readJson<Order[]>("orders.json", []);
  const orderRows = orders.map((o) => ({
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
  }));
  if (orderRows.length) {
    const { error } = await supabase.from("orders").upsert(orderRows, { onConflict: "key" });
    if (error) throw error;
  }
  console.log(`orders: ${orderRows.length} upserted`);

  const eventRows = orders.flatMap((o) =>
    o.events.map((e) => ({ order_key: o.key, at: e.at, type: e.type, text: e.text, by: e.by })),
  );
  if (eventRows.length) {
    // events have no natural id in the source data — clear and re-insert per order to stay idempotent
    for (const key of [...new Set(eventRows.map((e) => e.order_key))]) {
      await supabase.from("order_events").delete().eq("order_key", key);
    }
    const { error } = await supabase.from("order_events").insert(eventRows);
    if (error) throw error;
  }
  console.log(`order_events: ${eventRows.length} inserted`);
}

async function migrateQuestions() {
  const rows = readJson<Question[]>("questions.json", []).map((q) => ({
    id: q.id,
    slug: q.slug,
    product_name: q.productName,
    name: q.name,
    phone: q.phone ?? null,
    text: q.text,
    answer: q.answer ?? null,
    status: q.status,
    created_at: q.createdAt,
    answered_at: q.answeredAt ?? null,
  }));
  if (rows.length) {
    const { error } = await supabase.from("questions").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  console.log(`questions: ${rows.length} upserted`);
}

async function migrateAudit() {
  const rows = readJson<AuditEntry[]>("audit.json", []).map((a) => ({
    at: a.at,
    user: a.user,
    action: a.action,
    entity: a.entity,
    entity_id: a.entityId,
    summary: a.summary,
  }));
  if (rows.length) {
    const { error } = await supabase.from("audit_log").insert(rows);
    if (error) throw error;
  }
  console.log(`audit_log: ${rows.length} inserted`);
}

async function migrateSite() {
  const site = readJson<SiteContent | Record<string, never>>("site.json", {});
  if (!("settings" in site)) {
    console.log("site.json empty — skipping settings/layouts/pages/posts");
    return;
  }

  const settingsRows = Object.entries(site.settings).map(([key, value]) => ({ key, value }));
  if (settingsRows.length) {
    const { error } = await supabase.from("site_settings").upsert(settingsRows, { onConflict: "key" });
    if (error) throw error;
  }
  console.log(`site_settings: ${settingsRows.length} upserted`);

  const layoutRows = Object.entries(site.layouts).map(([page_key, rec]) => ({
    page_key,
    draft: rec.draft,
    published: rec.published,
    published_at: rec.publishedAt ?? null,
    history: rec.history,
  }));
  if (layoutRows.length) {
    const { error } = await supabase.from("site_layouts").upsert(layoutRows, { onConflict: "page_key" });
    if (error) throw error;
  }
  console.log(`site_layouts: ${layoutRows.length} upserted`);

  const pageRows = site.pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    status: p.status,
    body: p.body,
    image: p.image ?? null,
    bullets: p.bullets ?? null,
    show_circles: !!p.showCircles,
    show_contact: !!p.showContact,
  }));
  if (pageRows.length) {
    const { error } = await supabase.from("site_pages").upsert(pageRows, { onConflict: "slug" });
    if (error) throw error;
  }
  console.log(`site_pages: ${pageRows.length} upserted`);

  const postRows = site.posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    date: p.date,
    read_minutes: p.readMinutes,
    image: p.image ?? null,
    body: p.body,
    related: p.related,
    status: p.status,
    author: p.author ?? null,
    author_type: p.authorType ?? null,
  }));
  if (postRows.length) {
    const { error } = await supabase.from("site_posts").upsert(postRows, { onConflict: "slug" });
    if (error) throw error;
  }
  console.log(`site_posts: ${postRows.length} upserted`);
}

async function main() {
  await migrateProducts();
  await migrateOrders();
  await migrateQuestions();
  await migrateAudit();
  await migrateSite();
  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
