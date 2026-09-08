import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orderStore";
import { getSite } from "@/lib/siteStore";
import { orderNumber } from "@/lib/orders";
import PrintSheet from "@/app/admin/_components/PrintSheet";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ type?: string }> }) {
  const { key } = await params;
  const { type } = await searchParams;
  return { title: `${type === "invoice" ? "فاکتور" : "برگه بسته‌بندی"} ${orderNumber(key)}` };
}

// /admin/orders/[key]/print?type=packing|invoice — §4.2.4
export default async function PrintOrderPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ type?: string }> }) {
  const { key } = await params;
  const { type } = await searchParams;
  const order = getOrder(key);
  if (!order) notFound();
  const { settings } = getSite();
  return <PrintSheet order={order} type={type === "invoice" ? "invoice" : "packing"} store={settings.store} vatPercent={settings.payment.vatPercent ?? 0} />;
}
