import { getLayout } from "@/lib/siteStore";
import { emptySectionIds } from "@/lib/layoutResolve";
import { materials, patterns, usages } from "@/lib/taxonomy";
import LayoutBuilder from "@/app/admin/_components/LayoutBuilder";

export const metadata = { title: "فروش فوق‌العاده" };

export default async function AdminOfferBuilderPage() {
  const record = await getLayout("offer");
  const emptyIds = await emptySectionIds(record.draft);
  return (
    <LayoutBuilder
      layoutKey="offer"
      record={record}
      emptyIds={emptyIds}
      materials={materials.map((m) => m.name)}
      patterns={patterns.map((m) => m.name)}
      usages={usages.map((m) => m.name)}
    />
  );
}
