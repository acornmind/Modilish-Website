import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getPage } from "@/lib/siteStore";

// Generic rich-text pages (FAQ, terms, privacy, guarantee, custom) — §4.8.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(decodeURIComponent(slug));
  return { title: page ? page.title : "صفحه" };
}

export default async function SitePageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  if (decoded === "about") redirect("/about-us");
  if (decoded === "contact") redirect("/contact-us");
  const page = await getPage(decoded);
  if (!page || page.status !== "published") notFound();

  return (
    <main className="bg-white pb-12">
      <div className="mx-auto max-w-3xl px-4 pt-6 text-right lg:px-8 lg:pt-12">
        <h1 className="text-xl font-bold text-modi-purple-800 lg:text-3xl">{page.title}</h1>
        {page.image && (
          <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <Image src={page.image} alt={page.title} fill sizes="(min-width: 1024px) 768px, 100vw" className="object-cover" />
          </div>
        )}
        <div className="mt-4 space-y-3">
          {page.body.map((p, i) => (
            <p key={i} className="text-sm leading-8 text-[#2b2740] lg:text-base lg:leading-9">
              {p}
            </p>
          ))}
        </div>
        {page.bullets && page.bullets.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 pr-5 text-sm leading-7">
            {page.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
