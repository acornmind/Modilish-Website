import Link from "next/link";
import CatalogGrid from "@/components/CatalogGrid";
import { products, isListed } from "@/lib/products";
import { productMatches, unslug, type Dimension } from "@/lib/taxonomy";
import { haystack } from "@/lib/homeCategories";
import { matchesQuery } from "@/lib/search";
import { getSite } from "@/lib/siteStore";

const DIMS: Dimension[] = ["material", "pattern", "usage"];

export function generateMetadata() {
  return { title: getSite().settings.seo.shopTitle };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : undefined;

  const q = (get("q") ?? "").trim();

  // every supplied dimension applies at once — جنس + طرح + کاربرد combine
  const active: { dim: Dimension; value: string }[] = [];
  for (const d of DIMS) {
    const v = get(d);
    if (v) active.push({ dim: d, value: unslug(v) });
  }
  if (active.length === 0 && get("cat")) {
    active.push({ dim: "material", value: unslug(get("cat")!) });
  }

  const { catalogue } = getSite().settings;
  let list = products.filter((p) => isListed(p) && (catalogue.outOfStock === "show" || p.meters > 0));
  for (const { dim, value } of active) {
    list = list.filter((p) => productMatches(p, dim, value));
  }
  if (q) list = list.filter((p) => matchesQuery(haystack(p), q));

  const crumb = q
    ? `«${q}»`
    : active.length > 0
      ? active.map((a) => a.value).join(" · ")
      : "فروشگاه";

  return (
    <CatalogGrid
      products={list}
      title="فروشگاه"
      pathname="/shop"
      pageSize={catalogue.pageSize}
      chipPreview={catalogue.chipPreview}
      defaultSort={catalogue.defaultSort}
      searchParams={{
        orderby: get("orderby"),
        page: get("page"),
        material: get("material"),
        pattern: get("pattern"),
        usage: get("usage"),
        cat: get("cat"),
        q: get("q"),
      }}
      breadcrumb={
        <>
          <Link href="/">خانه</Link> » <span>{crumb}</span>
        </>
      }
    />
  );
}
