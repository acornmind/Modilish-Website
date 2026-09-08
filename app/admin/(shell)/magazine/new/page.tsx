import { getSite } from "@/lib/siteStore";
import PostEditor from "@/app/admin/_components/PostEditor";

export const metadata = { title: "نوشتن مطلب" };

export default function AdminNewPostPage() {
  const site = getSite();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <PostEditor
      isNew
      existingSlugs={site.posts.map((p) => p.slug)}
      post={{
        slug: "",
        title: "",
        excerpt: "",
        date: today,
        readMinutes: 3,
        image: "/img/about.jpg",
        body: [""],
        related: [{ label: "همه پارچه‌ها", href: "/shop" }],
        status: "draft",
        author: "تیم مدیلیش",
        authorType: "human",
      }}
    />
  );
}
