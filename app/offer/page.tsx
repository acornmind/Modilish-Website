import SectionRenderer from "@/components/SectionRenderer";
import { getLayout } from "@/lib/siteStore";
import { resolveLayout } from "@/lib/layoutResolve";

export const metadata = { title: "فروش فوق العاده" };

// Rendered from the published offer layout (admin → فروش فوق‌العاده) — §4.6.
export default async function OfferPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const record = getLayout("offer");
  const layout = preview === "draft" ? record.draft : record.published;
  const sections = resolveLayout(layout);

  return (
    <main className="page-bg min-h-[30vh] pb-8">
      {preview === "draft" && (
        <p className="bg-modi-warning-bg px-4 py-2 text-center text-xs font-bold text-modi-warning">
          پیش‌نمایش پیش‌نویس — این نسخه هنوز منتشر نشده است
        </p>
      )}
      {sections.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-modi-gray-900">فعلاً پیشنهاد ویژه‌ای فعال نیست.</p>
      ) : (
        <SectionRenderer sections={sections} />
      )}
    </main>
  );
}
