import Link from "next/link";
import { getAuditLog } from "@/lib/siteStore";
import { faNum } from "@/lib/adminFormat";

export const metadata = { title: "گزارش فعالیت" };

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

const entityLabel: Record<string, string> = {
  product: "محصول",
  layout: "صفحه",
  page: "صفحه",
  post: "مطلب",
  settings: "تنظیمات",
  media: "رسانه",
};

// §4.14 «گزارش فعالیت» — every write in the admin lands here (lib/siteStore.ts audit()).
export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  const { entity } = await searchParams;
  const all = getAuditLog();
  const log = entity ? all.filter((e) => e.entity === entity) : all;
  const entities = [...new Set(all.map((e) => e.entity))];

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/settings" className="text-xs text-modi-purple-800">تنظیمات</Link>
        <h1 className="text-base font-bold lg:text-lg">گزارش فعالیت</h1>
        <p className="mt-0.5 text-xs text-modi-gray-900">{faNum(all.length)} رویداد · هر تغییری که در مدیریت انجام می‌شود این‌جا ثبت می‌شود</p>
      </div>
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        <Link href="/admin/settings/audit" className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ${!entity ? "bg-modi-purple-800 text-white" : "bg-white"}`}>همه</Link>
        {entities.map((e) => (
          <Link key={e} href={`/admin/settings/audit?entity=${e}`} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ${entity === e ? "bg-modi-purple-800 text-white" : "bg-white"}`}>
            {entityLabel[e] ?? e}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
        {log.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-modi-gray-900">هنوز رویدادی ثبت نشده — با اولین ویرایش در مدیریت پر می‌شود.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#ede9f2] text-[11px] font-bold text-modi-gray-900">
                <th className="px-3 py-3 text-start">زمان</th>
                <th className="px-3 py-3 text-start">کاربر</th>
                <th className="px-3 py-3 text-start">کار</th>
                <th className="px-3 py-3 text-start">مورد</th>
                <th className="px-3 py-3 text-start">جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={i} className="border-b border-[#f3f0f7] last:border-b-0">
                  <td className="px-3 py-2 text-xs tabular-nums text-modi-gray-900">{fmt(e.at)}</td>
                  <td className="px-3 py-2 text-xs">{e.user}</td>
                  <td className="px-3 py-2 font-bold">{e.action}</td>
                  <td className="px-3 py-2 text-xs">
                    {entityLabel[e.entity] ?? e.entity} <span className="text-modi-gray-900" dir="ltr">{e.entityId}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-modi-gray-900">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
