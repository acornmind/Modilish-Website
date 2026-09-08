import { products, isListed } from "@/lib/products";
import { ensureHydrated } from "@/lib/productStore";
import { getSite } from "@/lib/siteStore";
import { getCustomers } from "@/lib/orderStore";
import { nextDeliveryDays } from "@/lib/iran";
import ManualOrderForm from "@/app/admin/_components/ManualOrderForm";

export const metadata = { title: "ثبت سفارش دستی" };

// ?phone= prefills the customer (from the customer page's «ثبت سفارش»).
export default async function AdminNewOrderPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone } = await searchParams;
  ensureHydrated();
  const { settings } = getSite();
  const { delivery } = settings;
  return (
    <ManualOrderForm
      products={products.filter((p) => isListed(p) && p.meters > 0).map(({ slug, name, image, price, salePrice, unit, limit, meters, category, attributes }) => ({ slug, name, image, price, salePrice, unit, limit, meters, category, attributes }))}
      provinces={delivery.provinces}
      defaultProvince={delivery.defaultProvince}
      pickupDays={nextDeliveryDays(delivery.daysAhead, delivery.closedWeekdays)}
      pickupHours={delivery.hours}
      pickupEnabled={delivery.pickupEnabled}
      codEnabled={delivery.codEnabled}
      knownCustomers={getCustomers().map((c) => ({ name: c.name, phone: c.phone }))}
      initialPhone={phone ?? ""}
      rules={settings.discountRules}
      shipping={settings.shipping}
      methodPrice={delivery.methods.find((m) => m.active)?.priceToman ?? 0}
    />
  );
}
