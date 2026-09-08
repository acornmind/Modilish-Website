// Shared, browser-safe bits for the dashboard. The numbers themselves are no
// longer mock — they come from lib/orderStore.ts via lib/adminData.ts
// (server-side) and reach the client components as props.

export type Period = "today" | "7d" | "30d" | "month";

export const periods: { key: Period; label: string }[] = [
  { key: "today", label: "امروز" },
  { key: "7d", label: "۷ روز" },
  { key: "30d", label: "۳۰ روز" },
  { key: "month", label: "ماه جاری" },
];

export type Kpi = {
  orders: number;
  salesToman: number;
  avgBasketToman: number;
  metersSold: number;
  deltaPct: { orders: number; sales: number; avgBasket: number; meters: number };
  spark: { orders: number[]; sales: number[]; avgBasket: number[]; meters: number[] };
};

export type Attention = {
  paidAwaitingPrep: number;
  readyForPickupToday: number;
  lowStockCount: number;
  pendingReviews: number;
  newMessages: number;
  gatewayHealthy: boolean;
  smsHealthy: boolean;
};
