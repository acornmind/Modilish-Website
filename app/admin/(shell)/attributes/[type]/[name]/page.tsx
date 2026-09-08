import { notFound } from "next/navigation";
import { ensureHydrated } from "@/lib/productStore";
import { getSite } from "@/lib/siteStore";
import { slugify } from "@/lib/taxonomy";
import { attributeTypeLabels, metaFor, tally, type AttributeType } from "@/lib/attributes";
import AttributeValueEditor from "@/app/admin/_components/AttributeValueEditor";

const types = Object.keys(attributeTypeLabels) as AttributeType[];

export async function generateMetadata({ params }: { params: Promise<{ type: string; name: string }> }) {
  const { type, name } = await params;
  return { title: `${attributeTypeLabels[type as AttributeType] ?? "ویژگی"} · ${decodeURIComponent(name)}` };
}

// §4.4 — one attribute value: rename / merge across products, menu order,
// and the text + image that top the value's storefront page.
export default async function AttributeValuePage({ params }: { params: Promise<{ type: string; name: string }> }) {
  const { type: t, name: n } = await params;
  const type = types.find((x) => x === t);
  if (!type) notFound();
  const name = decodeURIComponent(n);
  ensureHydrated();
  const all = tally(type);
  const me = all.find((v) => v.name === name);
  if (!me) notFound();
  const { attributeMeta } = getSite().settings;
  const siteHref = type === "material" ? `/materials/${encodeURIComponent(slugify(name))}` : type === "pattern" || type === "usage" ? `/shop?${type}=${encodeURIComponent(slugify(name))}` : `/shop?q=${encodeURIComponent(name)}`;
  return (
    <AttributeValueEditor
      type={type}
      typeLabel={attributeTypeLabels[type]}
      name={name}
      count={me.count}
      siblings={all.filter((v) => v.name !== name).map((v) => v.name)}
      meta={metaFor(attributeMeta, type, name)}
      allMeta={attributeMeta}
      siteHref={siteHref}
    />
  );
}
