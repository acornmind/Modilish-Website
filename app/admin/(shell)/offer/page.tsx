import { getLayout } from "@/lib/siteStore";
import { emptySectionIds } from "@/lib/layoutResolve";
import { materials, patterns, usages } from "@/lib/taxonomy";
import LayoutBuilder from "@/app/admin/_components/LayoutBuilder";

export const metadata = { title: "فروش فوق‌العاده" };

export default function AdminOfferBuilderPage() {
  const record = getLayout("offer");
  return (
    <LayoutBuilder
      layoutKey="offer"
      record={record}
      emptyIds={emptySectionIds(record.draft)}
      materials={materials.map((m) => m.name)}
      patterns={patterns.map((m) => m.name)}
      usages={usages.map((m) => m.name)}
    />
  );
}
