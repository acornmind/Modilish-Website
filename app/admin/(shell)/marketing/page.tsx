import { getCustomers, getOrders, getSegments } from "@/lib/orderStore";
import { getSite } from "@/lib/siteStore";
import { products } from "@/lib/products";
import { ensureHydrated } from "@/lib/productStore";
import { materials, patterns, usages } from "@/lib/taxonomy";
import MarketingPanel, { type Reports } from "@/app/admin/_components/MarketingPanel";

export const metadata = { title: "بازاریابی" };

const live = (status: string) => !["pending_payment", "failed", "cancelled"].includes(status);

async function buildReports(): Promise<Reports> {
  await ensureHydrated();
  const [allOrders, customers] = await Promise.all([getOrders(), getCustomers()]);
  const orders = allOrders.filter((o) => live(o.status));
  const day = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "numeric", day: "numeric" });
  const byDay = Array.from({ length: 30 }, (_, i) => {
    const start = today.getTime() - (29 - i) * day;
    const list = orders.filter((o) => { const t = new Date(o.createdAt).getTime(); return t >= start && t < start + day; });
    return { day: fmt.format(new Date(start)), orders: list.length, sales: list.reduce((s, o) => s + o.total, 0) };
  });
  const mat = new Map<string, { meters: number; sales: number }>();
  const prov = new Map<string, number>();
  const method = new Map<string, number>();
  const coupons = new Map<string, { uses: number; revenue: number }>();
  for (const o of orders) {
    for (const l of o.lines) {
      const cat = products.find((p) => p.slug === l.slug)?.category ?? "—";
      const cur = mat.get(cat) ?? { meters: 0, sales: 0 };
      mat.set(cat, { meters: cur.meters + (l.unit === "متر" ? l.qty : 0), sales: cur.sales + l.lineTotal });
    }
    const p = o.delivery.type === "post" ? o.delivery.province : "تحویل حضوری";
    prov.set(p, (prov.get(p) ?? 0) + 1);
    const m = o.delivery.type === "post" ? o.delivery.carrier : "حضوری";
    method.set(m, (method.get(m) ?? 0) + 1);
    if (o.couponCode) {
      const c = coupons.get(o.couponCode) ?? { uses: 0, revenue: 0 };
      coupons.set(o.couponCode, { uses: c.uses + 1, revenue: c.revenue + o.total });
    }
  }
  const refunds = new Map<string, number>();
  for (const o of allOrders) if (o.status === "cancelled" || o.status === "returned") refunds.set(o.cancelReason ?? "—", (refunds.get(o.cancelReason ?? "—") ?? 0) + 1);
  return {
    byDay,
    byMaterial: [...mat.entries()].map(([name, v]) => ({ name, meters: Math.round(v.meters * 10) / 10, sales: v.sales })).sort((a, b) => b.meters - a.meters).slice(0, 8),
    byProvince: [...prov.entries()].map(([name, orders]) => ({ name, orders })).sort((a, b) => b.orders - a.orders),
    byMethod: [...method.entries()].map(([name, orders]) => ({ name, orders })).sort((a, b) => b.orders - a.orders),
    coupons: [...coupons.entries()].map(([code, v]) => ({ code, ...v })),
    refundsByReason: [...refunds.entries()].map(([reason, count]) => ({ reason, count })),
    newVsReturning: { newCustomers: customers.filter((c) => c.ordersCount <= 1).length, returning: customers.filter((c) => c.ordersCount > 1).length },
  };
}

export default async function AdminMarketingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initial = (["discounts", "coupons", "shipping", "campaigns", "segments", "sms", "referral", "reports"] as const).find((t) => t === tab);
  await ensureHydrated();
  const [site, orders, customers, segments, reports] = await Promise.all([getSite(), getOrders(), getCustomers(), getSegments(), buildReports()]);
  const { settings } = site;

  // live numbers per campaign: orders that used one of its coupons
  const campaignStats = Object.fromEntries(
    settings.campaigns.map((c) => {
      const list = orders.filter((o) => live(o.status) && o.couponCode && c.couponCodes.includes(o.couponCode));
      return [c.id, { orders: list.length, revenue: list.reduce((s, o) => s + o.total, 0) }];
    }),
  );

  // top referrers: referral codes on paid orders, resolved to the customer whose phone ends with the code digits
  const uses = new Map<string, number>();
  for (const o of orders) if (live(o.status) && o.customer.referral) uses.set(o.customer.referral.toUpperCase(), (uses.get(o.customer.referral.toUpperCase()) ?? 0) + 1);
  const topReferrers = [...uses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, n]) => {
      const owner = customers.find((c) => c.phone.endsWith(code.replace(/^MD/, "")));
      return { code, uses: n, name: owner?.name ?? "", phone: owner?.phone ?? "" };
    });

  return (
    <MarketingPanel
      coupons={settings.coupons}
      segments={segments}
      reports={reports}
      initialTab={initial}
      rules={settings.discountRules}
      shipping={settings.shipping}
      campaigns={settings.campaigns}
      referral={settings.referral}
      scopeOptions={{
        material: materials.map((m) => m.name),
        pattern: patterns.map((p) => p.name),
        usage: usages.map((u) => u.name),
        products: products.map((p) => ({ slug: p.slug, name: p.name })),
      }}
      simProducts={products.map(({ slug, name, category, price, salePrice, unit, limit, attributes }) => ({ slug, name, category, price, salePrice, unit, limit, attributes }))}
      campaignStats={campaignStats}
      topReferrers={topReferrers}
      methodPrice={settings.delivery.methods.find((m) => m.active)?.priceToman ?? 0}
    />
  );
}
