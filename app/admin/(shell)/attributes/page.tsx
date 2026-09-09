import Link from "next/link";
import { products } from "@/lib/products";
import { ensureHydrated } from "@/lib/productStore";
import { slugify } from "@/lib/taxonomy";
import { faNum } from "@/lib/adminFormat";
import { attributeTypeLabels, tally, type AttributeType } from "@/lib/attributes";
import { getSite } from "@/lib/siteStore";
import { metaFor } from "@/lib/attributes";
import AttributesTabs from "@/app/admin/_components/AttributesTabs";

export const metadata = { title: "ویژگی‌های پارچه" };

const siteHref = (type: AttributeType, v: string) =>
  type === "material" ? `/materials/${encodeURIComponent(slugify(v))}` : type === "pattern" || type === "usage" ? `/shop?${type}=${encodeURIComponent(slugify(v))}` : `/shop?q=${encodeURIComponent(v)}`;

// §4.4 — values with product counts. Values come from the products themselves;
// each one opens an editor for rename/merge, menu order and the landing text.
export default async function AdminAttributesPage() {
  await ensureHydrated();
  const { attributeMeta } = (await getSite()).settings;
  const tabs = (Object.keys(attributeTypeLabels) as AttributeType[]).map((type) => ({
    key: type,
    label: attributeTypeLabels[type],
    values: tally(type).map((v) => {
      const meta = metaFor(attributeMeta, type, v.name);
      return { ...v, href: siteHref(type, v.name), editHref: `/admin/attributes/${type}/${encodeURIComponent(v.name)}`, hidden: !meta.showInMenu, hasMeta: !!(meta.description || meta.image) };
    }),
  }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-base font-bold lg:text-lg">ویژگی‌های پارچه</h1>
          <p className="mt-0.5 text-xs text-modi-gray-900">
            {faNum(products.length)} محصول · روی هر مقدار کلیک کنید تا نامش را تغییر دهید، با مقدار دیگری ادغام کنید یا متن و ترتیب منویش را بنویسید. مقدار جدید با ویرایش مشخصات در{" "}
            <Link href="/admin/products" className="text-modi-purple-800">محصولات</Link> ساخته می‌شود.
          </p>
        </div>
      </div>
      <AttributesTabs tabs={tabs} />
    </div>
  );
}
