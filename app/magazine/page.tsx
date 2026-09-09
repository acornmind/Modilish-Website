import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/content";
import { getPublishedPosts } from "@/lib/siteStore";

export const metadata = { title: "مجله" };

// Lists published posts from admin → مجله (§4.7).
export default async function MagazineIndex() {
  const posts = await getPublishedPosts();
  return (
    <main className="page-bg min-h-[calc(100vh-64px)] pb-12">
      <div className="flex h-14 items-center bg-white px-4 font-bold shadow-sm lg:h-16 lg:px-8 lg:text-lg">
        مجله مدیلیش
      </div>
      <p className="px-4 pt-4 text-xs leading-6 text-modi-gray-900 lg:px-8">
        راهنمای انتخاب، محاسبه متراژ و نگهداری پارچه — از تیم مدیلیش.
      </p>
      {posts.length === 0 && (
        <p className="px-4 py-16 text-center text-sm text-modi-gray-900">هنوز مطلبی منتشر نشده است.</p>
      )}
      <ul className="modi-container space-y-4 p-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0 lg:px-8 lg:py-6">
        {posts.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/magazine/${a.slug}`}
              className="block overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] transition lg:hover:-translate-y-1"
            >
              <div className="relative aspect-[16/9] w-full">
                <Image src={a.image} alt="" fill sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
              </div>
              <div className="p-4 text-right">
                <p className="text-[11px] text-modi-gray-900">
                  {formatDate(a.date)} · {a.readMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
                </p>
                <h2 className="mt-1.5 text-sm font-bold leading-6 lg:text-base">{a.title}</h2>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-modi-gray-900">{a.excerpt}</p>
                <span className="mt-3 inline-block text-xs font-bold text-modi-purple-800">ادامه مطلب ←</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
