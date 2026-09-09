import { getSite } from "@/lib/siteStore";
import PageEditor from "@/app/admin/_components/PageEditor";

export const metadata = { title: "صفحه جدید" };

export default async function AdminNewPage() {
  const site = await getSite();
  return (
    <PageEditor
      isNew
      existingSlugs={site.pages.map((p) => p.slug)}
      page={{ slug: "", title: "", status: "draft", body: [""] }}
    />
  );
}
