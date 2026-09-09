import Image from "next/image";
import Link from "next/link";
import CategoryCircles from "@/components/CategoryCircles";
import { getPage, getSite } from "@/lib/siteStore";
import { resolveLayout } from "@/lib/layoutResolve";

export const metadata = { title: "درباره ما" };

// Content from admin → صفحات → درباره ما (§4.8).
export default async function AboutPage() {
  const site = await getSite();
  const page = await getPage("about");
  const { store } = site.settings;
  if (!page) return <main className="min-h-[30vh] bg-white" />;

  const circles = page.showCircles
    ? (await resolveLayout(site.layouts.home.published)).find((s) => s.type === "circles")
    : undefined;

  return (
    <main className="bg-white pb-6">
      <div className="modi-container px-4 pt-6 text-right lg:px-8 lg:pt-14">
        <h1 className="text-xl font-bold text-modi-purple-800 lg:text-3xl">{page.title}</h1>

        <div className="mt-4 lg:mt-8 lg:flex lg:flex-row-reverse lg:items-start lg:gap-10">
          {page.image && (
            <div className="relative h-44 w-full overflow-hidden rounded-2xl lg:h-80 lg:w-[38%] lg:shrink-0">
              <Image src={page.image} alt={page.title} fill sizes="(min-width: 1024px) 38vw, 100vw" className="object-cover" />
            </div>
          )}
          <div className="mt-4 space-y-3 lg:mt-0">
            {page.body.map((p, i) => (
              <p key={i} className="text-sm leading-8 text-[#2b2740] lg:text-base lg:leading-9">
                {p}
              </p>
            ))}
          </div>
        </div>

        {page.bullets && page.bullets.length > 0 && (
          <ul className="mt-6 grid grid-cols-2 gap-3 lg:mt-8 lg:gap-4">
            {page.bullets.map((d) => (
              <li
                key={d}
                className="flex items-center justify-end gap-2 rounded-xl bg-modi-gray-300 px-3 py-3 text-xs lg:px-4 lg:text-sm"
              >
                <span>{d}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0">
                  <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="#6b3fa0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 text-xs">
          <a
            href={store.telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-xl bg-modi-purple-800 px-5 font-bold text-white"
          >
            پشتیبانی تلگرام {store.telegram}
          </a>
          <Link href="/shop" className="inline-flex h-10 items-center rounded-xl bg-modi-purple-200 px-5 text-modi-purple-800">
            مشاهده محصولات
          </Link>
        </div>
      </div>

      {circles && circles.type === "circles" && (
        <div className="mt-8">
          <p className="px-4 pb-1 text-right text-sm font-bold lg:px-8">دسته‌های محبوب</p>
          <CategoryCircles items={circles.items} />
        </div>
      )}
    </main>
  );
}
