import { notFound } from "next/navigation";
import { getCustomerMeta, getOrders } from "@/lib/orderStore";
import CustomerDetail from "@/app/admin/_components/CustomerDetail";

export async function generateMetadata({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const first = getOrders().find((o) => o.customer.phone === phone);
  return { title: `${first?.customer.name ?? phone}` };
}

export default async function AdminCustomerPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const orders = getOrders().filter((o) => o.customer.phone === phone);
  if (orders.length === 0) notFound();
  return <CustomerDetail phone={phone} name={orders[0].customer.name} orders={orders} meta={getCustomerMeta(phone)} />;
}
