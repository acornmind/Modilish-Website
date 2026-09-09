import Link from "next/link";
import { getCustomers, getSegments } from "@/lib/orderStore";
import { formatOrderTime } from "@/lib/orders";
import { faNum, tomanShort } from "@/lib/adminFormat";
import CustomersTable from "@/app/admin/_components/CustomersTable";

export const metadata = { title: "مشتریان" };

// §4.9 — every phone number that has placed an order is a customer record
// (real OTP sign-in will add browsers-only visitors in phase 1).
// ?segment= narrows the list to one of the marketing segments.
export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  const { segment } = await searchParams;
  const all = await getCustomers();
  const seg = segment ? (await getSegments()).find((s) => s.name === segment) : undefined;
  const customers = seg ? all.filter((c) => seg.phones.includes(c.phone)) : all;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-base font-bold lg:text-lg">مشتریان</h1>
          <p className="mt-0.5 text-xs text-modi-gray-900">
            {faNum(customers.length)} مشتری{seg ? ` در بخش «${seg.name}» — ${seg.definition}` : " · ساخته‌شده از سفارش‌ها"}
            {seg && <> · <Link href="/admin/customers" className="font-bold text-modi-purple-800">همه مشتریان</Link></>}
          </p>
        </div>
        {seg && <Link href={`/admin/sms?tab=mass&segment=${encodeURIComponent(seg.name)}`} className="inline-flex h-10 items-center rounded-xl bg-modi-purple-200 px-4 text-sm font-bold text-modi-purple-800">پیامک به این بخش</Link>}
        <Link href="/admin/orders/new" className="inline-flex h-10 items-center rounded-xl bg-modi-purple-200 px-4 text-sm font-bold text-modi-purple-800">ثبت سفارش برای مشتری</Link>
      </div>
      <CustomersTable
        customers={customers.map((c) => ({
          ...c,
          lastOrderLabel: formatOrderTime(c.lastOrderAt),
          totalLabel: tomanShort(c.totalSpent),
        }))}
      />
    </div>
  );
}
