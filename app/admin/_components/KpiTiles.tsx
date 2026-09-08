"use client";

import { periods, type Kpi, type Period } from "@/lib/adminMock";
import { faNum, metersLabel, pct, tomanShort } from "@/lib/adminFormat";
import Sparkline from "./Sparkline";

export default function KpiTiles({
  period,
  onPeriodChange,
  kpiByPeriod,
}: {
  period: Period;
  onPeriodChange: (p: Period) => void;
  kpiByPeriod: Record<Period, Kpi>;
}) {
  const kpi = kpiByPeriod[period];

  const tiles = [
    { key: "orders", label: "سفارش‌ها", value: faNum(kpi.orders), delta: kpi.deltaPct.orders, spark: kpi.spark.orders },
    { key: "sales", label: "فروش", value: tomanShort(kpi.salesToman), delta: kpi.deltaPct.sales, spark: kpi.spark.sales },
    { key: "avgBasket", label: "میانگین سبد", value: tomanShort(kpi.avgBasketToman), delta: kpi.deltaPct.avgBasket, spark: kpi.spark.avgBasket },
    { key: "meters", label: "متراژ فروخته‌شده", value: metersLabel(kpi.metersSold), delta: kpi.deltaPct.meters, spark: kpi.spark.meters },
  ] as const;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPeriodChange(p.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              period === p.key ? "bg-modi-purple-800 text-white" : "bg-white text-[#2b2740] hover:bg-modi-purple-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const positive = t.delta >= 0;
          return (
            <div key={t.key} className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
              <p className="text-xs text-modi-gray-900">{t.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums lg:text-xl">{t.value}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`text-[11px] font-bold tabular-nums ${positive ? "text-modi-success" : "text-modi-danger"}`} title="نسبت به دوره قبل">
                  {pct(t.delta)}
                </span>
                <Sparkline points={t.spark} positive={positive} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
