import Link from "next/link";
import { getSite } from "@/lib/siteStore";
import { pageHref } from "@/lib/siteContent";
import AdminIcon from "@/app/admin/icons";

export const metadata = { title: "صفحات" };

const kinds: Record<string, string> = {
  about: "درباره ما — تصویر، متن معرفی، ویژگی‌ها",
  contact: "تماس با ما — اطلاعات از تنظیمات فروشگاه",
  guide: "راهنمای خرید متراژ",
  faq: "سوالات متداول",
  terms: "قوانین و شرایط",
  privacy: "حریم خصوصی",
  guarantee: "گارانتی ۷ روزه",
};

// §4.8 — the static pages, each with the block editor.
export default function AdminPagesPage() {
  const pages = getSite().pages;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-base font-bold lg:text-lg">صفحات</h1>
          <p className="mt-0.5 text-xs text-modi-gray-900">درباره ما، تماس با ما، راهنمای خرید، صفحات حقوقی و صفحات دلخواه</p>
        </div>
        <Link href="/admin/pages/new" className="inline-flex h-10 items-center rounded-xl bg-modi-purple-800 px-4 text-sm font-bold text-white hover:bg-modi-purple-500">
          صفحه جدید
        </Link>
      </div>
      <div className="rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
        {pages.map((p) => (
          <div key={p.slug} className="flex items-center gap-3 border-t border-[#f3f0f7] px-4 py-3 first:border-t-0">
            <div className="min-w-0 flex-1">
              <Link href={`/admin/pages/${encodeURIComponent(p.slug)}`} className="block truncate text-sm font-bold hover:text-modi-purple-800">
                {p.title}
              </Link>
              <p className="mt-0.5 text-[11px] text-modi-gray-900">
                {kinds[p.slug] ?? "صفحه دلخواه"} · <span dir="ltr">{pageHref(p.slug)}</span>
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${p.status === "published" ? "bg-modi-success-bg text-modi-success" : "bg-modi-warning-bg text-modi-warning"}`}>
              {p.status === "published" ? "منتشرشده" : "پیش‌نویس"}
            </span>
            <Link href={`/admin/pages/${encodeURIComponent(p.slug)}`} className="shrink-0 rounded-lg bg-modi-purple-200 px-3 py-1.5 text-xs font-bold text-modi-purple-800">
              ویرایش
            </Link>
            <Link href={pageHref(p.slug)} target="_blank" aria-label="مشاهده" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-modi-gray-900 hover:bg-modi-gray-500">
              <AdminIcon name="external" size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
