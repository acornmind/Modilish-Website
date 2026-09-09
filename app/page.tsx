import SectionRenderer from "@/components/SectionRenderer";
import { getLayout } from "@/lib/siteStore";
import { resolveLayout } from "@/lib/layoutResolve";

// Rendered from the published home layout (admin → صفحه اصلی). `?preview=draft`
// shows the unpublished draft — the builder's live preview uses it.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const record = await getLayout("home");
  const layout = preview === "draft" ? record.draft : record.published;
  const sections = await resolveLayout(layout);

  return (
    <main className="page-bg pb-8">
      {preview === "draft" && (
        <p className="bg-modi-warning-bg px-4 py-2 text-center text-xs font-bold text-modi-warning">
          پیش‌نمایش پیش‌نویس — این نسخه هنوز منتشر نشده است
        </p>
      )}
      <SectionRenderer sections={sections} />
    </main>
  );
}
