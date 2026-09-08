import { getSite } from "@/lib/siteStore";
import PageEditor from "@/app/admin/_components/PageEditor";

export const metadata = { title: "صفحه جدید" };

export default function AdminNewPage() {
  return (
    <PageEditor
      isNew
      existingSlugs={getSite().pages.map((p) => p.slug)}
      page={{ slug: "", title: "", status: "draft", body: [""] }}
    />
  );
}
