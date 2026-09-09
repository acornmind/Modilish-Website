import { getOrders } from "@/lib/orderStore";
import OrdersList from "@/app/admin/_components/OrdersList";

export const metadata = { title: "سفارش‌ها" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const allowed = ["all", "pending_payment", "paid", "preparing", "shipped", "ready_for_pickup", "delivered", "closed"] as const;
  const initial = allowed.find((t) => t === status);
  return <OrdersList orders={await getOrders()} initialTab={initial} />;
}
