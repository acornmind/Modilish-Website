import { notFound } from "next/navigation";
import { getSite } from "@/lib/siteStore";
import PageEditor from "@/app/admin/_components/PageEditor";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getSite().pages.find((p) => p.slug === decodeURIComponent(slug));
  return { title: page ? `${page.title}` : "صفحات" };
}

export default async function AdminEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = getSite();
  const page = site.pages.find((p) => p.slug === decodeURIComponent(slug));
  if (!page) notFound();
  return <PageEditor page={page} existingSlugs={site.pages.map((p) => p.slug)} />;
}
