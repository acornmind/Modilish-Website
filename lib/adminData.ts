// Server-only: the dashboard's numbers, computed from the live stores.
// Import only from Server Components (pulls in the service-role client via the stores).
import { products } from "./products";
import { LOW_STOCK_THRESHOLD_METERS } from "./constants";
import { ensureHydrated } from "./productStore";
import { getSite } from "./siteStore";
import { integrationHealth } from "./siteContent";
import { bestSellersFor, getMessages, getOrders, getQuestions, getReviews, kpisFor } from "./orderStore";
import { periods, type Attention, type Kpi, type Period } from "./adminMock";

export type ResolvedBestSeller = {
  slug: string;
  metersSold: number;
  product: (typeof products)[number];
  stockRemaining: number;
  lowStock: boolean;
};

export async function resolveBestSellers(period: Period): Promise<ResolvedBestSeller[]> {
  return (await bestSellersFor(period)).map((b) => ({
    ...b,
    stockRemaining: b.product.meters,
    lowStock: b.product.meters > 0 && b.product.meters <= LOW_STOCK_THRESHOLD_METERS,
  }));
}

export async function resolveBestSellersAllPeriods(): Promise<Record<Period, ResolvedBestSeller[]>> {
  const entries = await Promise.all(periods.map(async (p) => [p.key, await resolveBestSellers(p.key)] as const));
  return Object.fromEntries(entries) as Record<Period, ResolvedBestSeller[]>;
}

export async function kpisAllPeriods(): Promise<Record<Period, Kpi>> {
  const entries = await Promise.all(periods.map(async (p) => [p.key, await kpisFor(p.key)] as const));
  return Object.fromEntries(entries) as Record<Period, Kpi>;
}

export async function getLowStockProducts() {
  await ensureHydrated();
  return products.filter((p) => p.meters > 0 && p.meters <= LOW_STOCK_THRESHOLD_METERS);
}

export async function getNeedsAttention(): Promise<Attention> {
  const [orders, site, reviews, messages, lowStock] = await Promise.all([getOrders(), getSite(), getReviews(), getMessages(), getLowStockProducts()]);
  const health = integrationHealth(site.settings);
  return {
    paidAwaitingPrep: orders.filter((o) => o.status === "paid").length,
    readyForPickupToday: orders.filter((o) => o.status === "ready_for_pickup").length,
    lowStockCount: lowStock.length,
    pendingReviews: reviews.filter((r) => r.status === "pending").length,
    newMessages: messages.filter((m) => m.status === "new").length,
    gatewayHealthy: health.gateway,
    smsHealthy: health.sms,
  };
}

/** Sidebar badges — "orders awaiting action, reviews pending" (§3.2); unanswered product questions count too. */
export async function getNavBadges() {
  const [a, questions] = await Promise.all([getNeedsAttention(), getQuestions()]);
  return { orders: a.paidAwaitingPrep, reviews: a.pendingReviews + a.newMessages + questions.filter((q) => q.status === "pending").length };
}
