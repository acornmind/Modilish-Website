// Server-only: the dashboard's numbers, computed from the live stores.
// Import only from Server Components (pulls in fs via the stores).
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

export function resolveBestSellers(period: Period): ResolvedBestSeller[] {
  return bestSellersFor(period).map((b) => ({
    ...b,
    stockRemaining: b.product.meters,
    lowStock: b.product.meters > 0 && b.product.meters <= LOW_STOCK_THRESHOLD_METERS,
  }));
}

export function resolveBestSellersAllPeriods(): Record<Period, ResolvedBestSeller[]> {
  return Object.fromEntries(periods.map((p) => [p.key, resolveBestSellers(p.key)])) as Record<Period, ResolvedBestSeller[]>;
}

export function kpisAllPeriods(): Record<Period, Kpi> {
  return Object.fromEntries(periods.map((p) => [p.key, kpisFor(p.key)])) as Record<Period, Kpi>;
}

export function getLowStockProducts() {
  ensureHydrated();
  return products.filter((p) => p.meters > 0 && p.meters <= LOW_STOCK_THRESHOLD_METERS);
}

export function getNeedsAttention(): Attention {
  const orders = getOrders();
  const health = integrationHealth(getSite().settings);
  return {
    paidAwaitingPrep: orders.filter((o) => o.status === "paid").length,
    readyForPickupToday: orders.filter((o) => o.status === "ready_for_pickup").length,
    lowStockCount: getLowStockProducts().length,
    pendingReviews: getReviews().filter((r) => r.status === "pending").length,
    newMessages: getMessages().filter((m) => m.status === "new").length,
    gatewayHealthy: health.gateway,
    smsHealthy: health.sms,
  };
}

/** Sidebar badges — "orders awaiting action, reviews pending" (§3.2); unanswered product questions count too. */
export function getNavBadges() {
  const a = getNeedsAttention();
  return { orders: a.paidAwaitingPrep, reviews: a.pendingReviews + a.newMessages + getQuestions().filter((q) => q.status === "pending").length };
}
