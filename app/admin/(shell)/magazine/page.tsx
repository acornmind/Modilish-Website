import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/content";
import { getSite } from "@/lib/siteStore";
import { faNum } from "@/lib/adminFormat";
import AdminIcon from "@/app/admin/icons";

export const metadata = { title: "مجله" };

// §4.7 — posts sorted by date with status, author and an AI tag for agent posts.
export default function AdminMagazinePage() {
  const posts = [...getSite().posts].sort((a, b) => (a.date < b.date ? 1 : -1));
  const published = posts.filter((p) => p.status === "published").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-base font-bold lg:text-lg">مجله</h1>
          <p className="mt-0.5 text-xs text-modi-gray-900">
            {faNum(posts.length)} مطلب · {faNum(published)} منتشرشده
          </p>
        </div>
        <Link href="/admin/magazine/new" className="inline-flex h-10 items-center rounded-xl bg-modi-purple-800 px-4 text-sm font-bold text-white hover:bg-modi-purple-500">
          نوشتن مطلب
        </Link>
      </div>

      <div className="rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
        {posts.length === 0 && <p className="px-4 py-12 text-center text-sm text-modi-gray-900">هنوز مطلبی نوشته نشده.</p>}
        {posts.map((p) => (
          <div key={p.slug} className="flex items-center gap-3 border-t border-[#f3f0f7] px-4 py-3 first:border-t-0">
            <Image src={p.image} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <Link href={`/admin/magazine/${encodeURIComponent(p.slug)}`} className="block truncate text-sm font-bold hover:text-modi-purple-800">
                {p.title}
              </Link>
              <p className="mt-0.5 text-[11px] text-modi-gray-900">
                {formatDate(p.date)} · {p.author}
                {p.authorType === "agent" && <span className="ms-1 rounded bg-modi-info-bg px-1 text-[10px] font-bold text-modi-info">AI</span>}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${p.status === "published" ? "bg-modi-success-bg text-modi-success" : "bg-modi-warning-bg text-modi-warning"}`}>
              {p.status === "published" ? "منتشرشده" : "پیش‌نویس"}
            </span>
            <Link href={`/admin/magazine/${encodeURIComponent(p.slug)}`} className="shrink-0 rounded-lg bg-modi-purple-200 px-3 py-1.5 text-xs font-bold text-modi-purple-800">
              ویرایش
            </Link>
            <Link href={`/magazine/${encodeURIComponent(p.slug)}?preview=1`} target="_blank" aria-label="مشاهده" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-modi-gray-900 hover:bg-modi-gray-500">
              <AdminIcon name="external" size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
