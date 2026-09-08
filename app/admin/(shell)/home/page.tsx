import { getLayout } from "@/lib/siteStore";
import { emptySectionIds } from "@/lib/layoutResolve";
import { materials, patterns, usages } from "@/lib/taxonomy";
import LayoutBuilder from "@/app/admin/_components/LayoutBuilder";

export const metadata = { title: "صفحه اصلی" };

export default function AdminHomeBuilderPage() {
  const record = getLayout("home");
  return (
    <LayoutBuilder
      layoutKey="home"
      record={record}
      emptyIds={emptySectionIds(record.draft)}
      materials={materials.map((m) => m.name)}
      patterns={patterns.map((m) => m.name)}
      usages={usages.map((m) => m.name)}
    />
  );
}
