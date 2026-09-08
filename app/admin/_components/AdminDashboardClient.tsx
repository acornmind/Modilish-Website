"use client";

import { useState } from "react";
import type { Attention, Kpi, Period } from "@/lib/adminMock";
import type { ResolvedBestSeller } from "@/lib/adminData";
import type { Order } from "@/lib/orders";
import NeedsAttention from "./NeedsAttention";
import KpiTiles from "./KpiTiles";
import RecentOrders from "./RecentOrders";
import BestSellers from "./BestSellers";
import QuickActions from "./QuickActions";

export default function AdminDashboardClient({
  attention,
  kpiByPeriod,
  bestSellersByPeriod,
  recentOrders,
}: {
  attention: Attention;
  kpiByPeriod: Record<Period, Kpi>;
  bestSellersByPeriod: Record<Period, ResolvedBestSeller[]>;
  recentOrders: Order[];
}) {
  const [period, setPeriod] = useState<Period>("today");

  return (
    <div>
      <NeedsAttention attention={attention} />
      <KpiTiles period={period} onPeriodChange={setPeriod} kpiByPeriod={kpiByPeriod} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <RecentOrders orders={recentOrders} />
        <BestSellers items={bestSellersByPeriod[period]} />
      </div>

      <div className="mt-4">
        <QuickActions />
      </div>
    </div>
  );
}
