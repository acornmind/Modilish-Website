import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/content";
import { getPublishedPosts, getSite } from "@/lib/siteStore";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = (await getSite()).posts.find((x) => x.slug === decodeURIComponent(slug));
  return { title: a ? `${a.title} | مجله` : "مجله" };
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const decoded = decodeURIComponent(slug);
  // `?preview=1` lets the admin editor open a draft
  const article = preview
    ? (await getSite()).posts.find((a) => a.slug === decoded)
    : (await getPublishedPosts()).find((a) => a.slug === decoded);
  if (!article) notFound();

  const others = (await getPublishedPosts()).filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <main className="bg-white pb-12 lg:pb-16">
      {article.status !== "published" && (
        <p className="bg-modi-warning-bg px-4 py-2 text-center text-xs font-bold text-modi-warning">پیش‌نمایش پیش‌نویس</p>
      )}
      <div className="mx-auto max-w-3xl px-4 pt-4 lg:px-8 lg:pt-8">
        <Link href="/magazine" className="inline-flex items-center gap-1 text-xs text-modi-purple-800">
          <svg width="7" height="11" viewBox="0 0 7 11" aria-hidden>
            <path d="M1.5 1l4 4.5-4 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          مجله مدیلیش
        </Link>

        <article className="mt-3 text-right">
          <h1 className="text-lg font-bold leading-8 lg:text-2xl lg:leading-10">{article.title}</h1>
          <p className="mt-2 text-[11px] text-modi-gray-900 lg:text-xs">
            {formatDate(article.date)} · {article.readMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
            {article.authorType === "agent" && " · این مطلب با کمک هوش مصنوعی تهیه شده"}
          </p>
          <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <Image src={article.image} alt="" fill priority sizes="(min-width: 1024px) 768px, 100vw" className="object-cover" />
          </div>
          <p className="mt-4 text-sm leading-8 text-gray-700 lg:text-base lg:leading-9">{article.excerpt}</p>

          <div className="mt-2 text-[13px] leading-8 text-[#2b2740] lg:text-base lg:leading-9">
            {article.body.map((p, i) => {
              const [head, ...rest] = p.split(":");
              const hasHead = rest.length > 0 && head.length < 40;
              return (
                <p key={i} className="mb-3">
                  {hasHead ? (
                    <>
                      <strong className="text-modi-purple-800">{head}:</strong>
                      {rest.join(":")}
                    </>
                  ) : (
                    p
                  )}
                </p>
              );
            })}
          </div>

          {article.related.length > 0 && (
            <div className="mt-6 border-t border-modi-gray-500 pt-4">
              <p className="mb-2 text-xs font-bold">پارچه‌های مرتبط</p>
              <div className="flex flex-wrap gap-2">
                {article.related.map((r) => (
                  <Link key={r.href + r.label} href={r.href} className="h-8 rounded-lg bg-modi-purple-200 px-3 text-xs leading-8 text-modi-purple-800">
                    {r.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {others.length > 0 && (
          <section className="mt-8 border-t border-modi-gray-500 pt-6">
            <h2 className="mb-3 text-sm font-bold">مطالب دیگر</h2>
            <ul className="space-y-3">
              {others.map((a) => (
                <li key={a.slug}>
                  <Link href={`/magazine/${a.slug}`} className="flex items-center gap-3 rounded-2xl bg-modi-gray-300 p-3">
                    <Image src={a.image} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 text-right">
                      <p className="line-clamp-2 text-sm font-bold leading-6">{a.title}</p>
                      <p className="mt-1 text-[11px] text-modi-gray-900">{a.readMinutes.toLocaleString("fa-IR")} دقیقه مطالعه</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
