import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orderStore";
import { getSite } from "@/lib/siteStore";
import { orderNumber } from "@/lib/orders";
import { products, isListed } from "@/lib/products";
import { ensureHydrated } from "@/lib/productStore";
import OrderDetail from "@/app/admin/_components/OrderDetail";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: `سفارش ${orderNumber(key)}` };
}

export default async function AdminOrderPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  await ensureHydrated();
  const order = await getOrder(key);
  if (!order) notFound();
  const { settings } = await getSite();
  return (
    <OrderDetail
      order={order}
      smsTemplates={settings.sms.templates}
      storeName={settings.store.name}
      products={products.filter((p) => isListed(p)).map(({ slug, name, image, unit, limit, meters }) => ({ slug, name, image, unit, limit, meters }))}
    />
  );
}
