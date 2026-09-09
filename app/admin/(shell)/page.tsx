import { getNeedsAttention, kpisAllPeriods, resolveBestSellersAllPeriods } from "@/lib/adminData";
import { getOrders } from "@/lib/orderStore";
import AdminDashboardClient from "@/app/admin/_components/AdminDashboardClient";

// Server Component: every number is computed fresh from the live stores on
// each visit (orders, products, reviews, integrations) — lib/adminData.ts.
export default async function AdminDashboardPage() {
  const [attention, kpiByPeriod, bestSellersByPeriod, orders] = await Promise.all([
    getNeedsAttention(),
    kpisAllPeriods(),
    resolveBestSellersAllPeriods(),
    getOrders(),
  ]);
  return (
    <AdminDashboardClient
      attention={attention}
      kpiByPeriod={kpiByPeriod}
      bestSellersByPeriod={bestSellersByPeriod}
      recentOrders={orders.slice(0, 10)}
    />
  );
}
