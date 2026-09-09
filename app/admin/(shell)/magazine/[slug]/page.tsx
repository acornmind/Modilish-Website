import { notFound } from "next/navigation";
import { getSite } from "@/lib/siteStore";
import PostEditor from "@/app/admin/_components/PostEditor";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = (await getSite()).posts.find((p) => p.slug === decodeURIComponent(slug));
  return { title: post ? `${post.title}` : "مجله" };
}

export default async function AdminEditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite();
  const post = site.posts.find((p) => p.slug === decodeURIComponent(slug));
  if (!post) notFound();
  return <PostEditor post={post} existingSlugs={site.posts.map((p) => p.slug)} />;
}
