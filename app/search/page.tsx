import Link from "next/link";
import CatalogGrid from "@/components/CatalogGrid";
import { products, isListed } from "@/lib/products";
import { haystack } from "@/lib/homeCategories";
import { matchesQuery } from "@/lib/search";
import { getSite } from "@/lib/siteStore";
import { ensureHydrated } from "@/lib/productStore";

export const metadata = { title: "جستجو" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : undefined;

  const term = (get("s") ?? "").trim();
  await ensureHydrated();
  const { catalogue } = (await getSite()).settings;
  const pool = products.filter((p) => isListed(p) && (catalogue.outOfStock === "show" || p.meters > 0));
  const results = term
    ? pool.filter((p) => matchesQuery(haystack(p), term))
    : [];

  return (
    <CatalogGrid
      products={results}
      showFilter={false}
      title="نتایج جستجو"
      pathname="/search"
      pageSize={catalogue.pageSize}
      chipPreview={catalogue.chipPreview}
      defaultSort={catalogue.defaultSort}
      searchParams={{ orderby: get("orderby"), page: get("page"), s: term }}
      breadcrumb={
        <>
          <Link href="/">خانه</Link> »{" "}
          <span>{term ? `جستجو برای «${term}»` : "جستجو"}</span>
        </>
      }
    />
  );
}
