import { getNeedsAttention, kpisAllPeriods, resolveBestSellersAllPeriods } from "@/lib/adminData";
import { getOrders } from "@/lib/orderStore";
import AdminDashboardClient from "@/app/admin/_components/AdminDashboardClient";

// Server Component: every number is computed fresh from the live stores on
// each visit (orders, products, reviews, integrations) — lib/adminData.ts.
export default function AdminDashboardPage() {
  return (
    <AdminDashboardClient
      attention={getNeedsAttention()}
      kpiByPeriod={kpisAllPeriods()}
      bestSellersByPeriod={resolveBestSellersAllPeriods()}
      recentOrders={getOrders().slice(0, 10)}
    />
  );
}
