import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import CatalogGrid from "@/components/CatalogGrid";
import { products, isListed } from "@/lib/products";
import { materials, unslug } from "@/lib/taxonomy";
import { ensureHydrated } from "@/lib/productStore";
import { getSite } from "@/lib/siteStore";
import { metaFor } from "@/lib/attributes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = unslug(slug);
  const { seo, attributeMeta } = (await getSite()).settings;
  const meta = metaFor(attributeMeta, "material", name);
  // per-value SEO from admin → ویژگی‌های پارچه, else the template from تنظیمات → سئو
  return { title: meta.seoTitle || seo.materialTitleTemplate.replace("%s", name), description: meta.seoDescription || undefined };
}

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const get = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : undefined;

  const decoded = decodeURIComponent(slug);
  const name = unslug(slug);
  if (!materials.some((m) => m.name === name)) notFound();

  await ensureHydrated();
  const { catalogue, attributeMeta } = (await getSite()).settings;
  const meta = metaFor(attributeMeta, "material", name);
  const list = products.filter(
    (p) => isListed(p) && p.category === name && (catalogue.outOfStock === "show" || p.meters > 0),
  );

  return (
    <>
      {(meta.description || meta.image) && (
        <section className="bg-white">
          <div className="modi-container flex items-center gap-4 px-4 py-4 lg:px-8 lg:py-6">
            {meta.image && (
              <Image src={meta.image} alt={name} width={72} height={72} className="h-16 w-16 shrink-0 rounded-full object-cover lg:h-20 lg:w-20" />
            )}
            {meta.description && <p className="text-xs leading-6 text-modi-gray-900 lg:text-sm lg:leading-7">{meta.description}</p>}
          </div>
        </section>
      )}
      <CatalogGrid
        products={list}
        showFilter={false}
        title={`خرید پارچه ${name}`}
        pathname={`/materials/${decoded}`}
        searchParams={{ orderby: get("orderby"), page: get("page") }}
        pageSize={catalogue.pageSize}
        chipPreview={catalogue.chipPreview}
        defaultSort={catalogue.defaultSort}
        breadcrumb={
          <>
            <Link href="/">خانه</Link> » <span>خرید پارچه {name}</span>
          </>
        }
      />
    </>
  );
}
