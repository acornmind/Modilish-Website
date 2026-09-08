import Link from "next/link";
import Image from "next/image";
import HeroSlider from "./HeroSlider";
import CategoryCircles from "./CategoryCircles";
import ProductCarousel from "./ProductCarousel";
import CountDown from "./CountDown";
import type { ResolvedSection } from "@/lib/layoutResolve";

const deviceClass = (d: ResolvedSection["device"]) =>
  d === "mobile" ? "lg:hidden" : d === "desktop" ? "hidden lg:block" : "";

/** Renders a published layout (home / offer) — docs/admin-spec.md §4.5, §8. */
export default function SectionRenderer({ sections }: { sections: ResolvedSection[] }) {
  // the info card / magazine / brand trio share one grid on desktop, as the
  // original home page did — everything else stacks full-width
  const out: React.ReactNode[] = [];
  let gridBuffer: ResolvedSection[] = [];

  const flushGrid = () => {
    if (gridBuffer.length === 0) return;
    const items = gridBuffer;
    gridBuffer = [];
    out.push(
      <div
        key={items.map((s) => s.id).join("+")}
        className="modi-container mt-6 grid grid-cols-1 gap-4 px-4 lg:mt-10 lg:grid-cols-2 lg:gap-6 lg:px-8"
      >
        {items.map((s) => (
          <div key={s.id} className={`${deviceClass(s.device)} ${s.type === "infoCard" ? "lg:col-span-2" : ""}`}>
            {s.type === "infoCard" && <InfoCard {...s} />}
            {s.type === "magazine" && <MagazineTeaser {...s} />}
            {s.type === "brand" && <BrandBlock {...s} />}
            {s.type === "richText" && <RichText {...s} />}
          </div>
        ))}
      </div>,
    );
  };

  for (const s of sections) {
    if (s.type === "infoCard" || s.type === "magazine" || s.type === "brand" || s.type === "richText") {
      gridBuffer.push(s);
      continue;
    }
    flushGrid();
    const cls = deviceClass(s.device);
    switch (s.type) {
      case "hero":
        out.push(
          <div key={s.id} className={cls}>
            <HeroSlider slides={s.slides} intervalMs={s.intervalMs} />
          </div>,
        );
        break;
      case "circles":
        out.push(
          <div key={s.id} className={cls}>
            <CategoryCircles items={s.items} />
          </div>,
        );
        break;
      case "productRow":
        out.push(
          <div key={s.id} className={cls}>
            <ProductCarousel title={s.title} href={s.href || undefined} products={s.products} />
          </div>,
        );
        break;
      case "banner":
        out.push(
          <div key={s.id} className={`modi-container mt-6 px-4 lg:px-8 ${cls}`}>
            <Link href={s.href || "/shop"} className="relative block h-40 w-full overflow-hidden rounded-2xl lg:h-72">
              <Image src={s.img} alt={s.alt} fill sizes="(min-width: 1024px) 1280px, 400px" className="object-cover" />
            </Link>
          </div>,
        );
        break;
      case "countdown":
        out.push(
          <div key={s.id} className={`modi-container mt-6 px-4 lg:px-8 ${cls}`}>
            <section className="rounded-2xl bg-white p-5 text-center shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:p-8">
              <h2 className="text-base font-bold text-modi-purple-800 lg:text-2xl">{s.title}</h2>
              {s.text && <p className="mt-1 text-xs text-modi-gray-900 lg:text-sm">{s.text}</p>}
              <CountDown weekday={s.weekday} />
            </section>
          </div>,
        );
        break;
    }
  }
  flushGrid();

  return <>{out}</>;
}

function InfoCard({ title, text, href }: Extract<ResolvedSection, { type: "infoCard" }>) {
  const inner = (
    <>
      <Image src="/img/box.png" alt="" width={96} height={96} className="h-20 w-20 shrink-0 object-contain lg:hidden" />
      <div className="text-right lg:hidden">
        <p className="text-sm font-bold text-modi-purple-800">{title}</p>
        <p className="mt-1 text-xs leading-6 text-modi-gray-900">{text}</p>
      </div>
      <div className="hidden items-center gap-4 text-right lg:flex">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
            <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7v-5z M6.5 19a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM17.5 19a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-bold text-white lg:text-base">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-white/80 lg:text-sm">{text}</p>
        </div>
      </div>
    </>
  );
  const cls =
    "flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:gap-6 lg:rounded-3xl lg:bg-gradient-to-l lg:from-modi-purple-800 lg:to-[#8b5fc7] lg:p-8 lg:shadow-[0_16px_40px_-16px_rgba(107,63,160,0.5)]";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <section className={cls}>{inner}</section>
  );
}

function MagazineTeaser({ title, linkText, posts }: Extract<ResolvedSection, { type: "magazine" }>) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <Link href="/magazine" className="flex items-center gap-1 text-xs text-modi-purple-800 lg:text-sm">
          <span>{linkText}</span>
          <svg width="7" height="11" viewBox="0 0 7 11" aria-hidden>
            <path d="M5.5 1l-4 4.5 4 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
        <h2 className="text-sm font-bold lg:text-lg">{title}</h2>
      </div>
      <div className="space-y-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/magazine/${post.slug}`}
            className="block rounded-2xl bg-white p-4 text-right shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] transition lg:p-5 lg:hover:-translate-y-1"
          >
            <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl lg:h-56">
              <Image src={post.image} alt={post.title} fill sizes="(min-width: 1024px) 600px, 360px" className="object-cover" />
            </div>
            <h3 className="text-sm font-bold lg:text-base">{post.title}</h3>
            <p className="mt-2 line-clamp-1 text-xs text-modi-gray-900 lg:mt-3 lg:line-clamp-2 lg:text-sm">{post.excerpt}</p>
            <span className="mt-3 inline-flex h-8 items-center rounded-lg bg-modi-purple-200 px-4 text-xs text-modi-purple-800 lg:mt-4">
              ادامه مطلب
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BrandBlock({ title, text, image, href }: Extract<ResolvedSection, { type: "brand" }>) {
  return (
    <section>
      <div className="mb-3 hidden items-center justify-between lg:flex">
        <Link href={href || "/about-us"} className="flex items-center gap-1 text-sm text-modi-purple-800">
          <span>بیشتر بدانید</span>
          <svg width="7" height="11" viewBox="0 0 7 11" aria-hidden>
            <path d="M5.5 1l-4 4.5 4 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <Link
        href={href || "/about-us"}
        className="block rounded-2xl bg-white p-4 text-right shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] transition lg:p-5 lg:hover:-translate-y-1"
      >
        <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl lg:h-56">
          <Image src={image} alt={title} fill sizes="(min-width: 1024px) 600px, 360px" className="object-cover" />
        </div>
        <h2 className="text-sm font-bold lg:hidden">{title}</h2>
        <p className="mt-2 text-xs leading-7 text-modi-gray-900 lg:mt-0 lg:text-sm lg:leading-8">{text}</p>
        <span className="mt-3 inline-block text-xs text-modi-purple-800 lg:hidden">درباره مدیلیش</span>
      </Link>
    </section>
  );
}

function RichText({ title, text }: Extract<ResolvedSection, { type: "richText" }>) {
  return (
    <section className="rounded-2xl bg-white p-4 text-right shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:col-span-2 lg:p-6">
      {title && <h2 className="mb-2 text-sm font-bold lg:text-lg">{title}</h2>}
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="mb-2 text-xs leading-7 text-[#2b2740] lg:text-sm lg:leading-8">
          {p}
        </p>
      ))}
    </section>
  );
}
