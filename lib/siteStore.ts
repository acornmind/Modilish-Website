// Server-only persistence for everything the admin edits besides products:
// layouts, pages, posts and settings live in Supabase (site_* tables) and are
// overlaid on the lib/siteContent.ts defaults; every write also lands in the
// append-only audit_log. Never import from a "use client" file.
import { cache } from "react";
import {
  defaultSiteContent,
  type Layout,
  type LayoutRecord,
  type Post,
  type SiteContent,
  type SitePage,
  type SiteSettings,
} from "./siteContent";
import { check, supabaseAdmin, unwrap } from "./supabase/server";

const ACTOR = "مو (مالک)";
const now = () => new Date().toISOString();

export type LayoutKey = "home" | "offer";

type SettingsRow = { key: string; value: unknown };
type LayoutRow = { page_key: string; draft: Layout; published: Layout; published_at: string | null; history: LayoutRecord["history"] | null };
type PageRow = {
  slug: string;
  title: string;
  status: SitePage["status"];
  body: string[] | null;
  image: string | null;
  bullets: string[] | null;
  show_circles: boolean;
  show_contact: boolean;
};
type PostRow = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  read_minutes: number;
  image: string | null;
  body: string[] | null;
  related: Post["related"] | null;
  status: Post["status"];
  author: string | null;
  author_type: Post["authorType"] | null;
};

const rowToLayout = (r: LayoutRow): LayoutRecord => ({
  draft: r.draft,
  published: r.published,
  publishedAt: r.published_at ? new Date(r.published_at).toISOString() : undefined,
  history: r.history ?? [],
});
const layoutToRow = (page_key: LayoutKey, rec: LayoutRecord): LayoutRow => ({
  page_key,
  draft: rec.draft,
  published: rec.published,
  published_at: rec.publishedAt ?? null,
  history: rec.history,
});

const rowToPage = (r: PageRow): SitePage => ({
  slug: r.slug,
  title: r.title,
  status: r.status,
  body: r.body ?? [],
  image: r.image ?? undefined,
  bullets: r.bullets ?? undefined,
  showCircles: r.show_circles || undefined,
  showContact: r.show_contact || undefined,
});
const pageToRow = (p: SitePage): PageRow => ({
  slug: p.slug,
  title: p.title,
  status: p.status,
  body: p.body,
  image: p.image ?? null,
  bullets: p.bullets ?? null,
  show_circles: !!p.showCircles,
  show_contact: !!p.showContact,
});

const rowToPost = (r: PostRow): Post => ({
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt,
  date: r.date,
  readMinutes: r.read_minutes,
  image: r.image ?? "",
  body: r.body ?? [],
  related: r.related ?? [],
  status: r.status,
  author: r.author ?? "",
  authorType: r.author_type ?? "human",
});
const postToRow = (p: Post): PostRow => ({
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  date: p.date,
  read_minutes: p.readMinutes,
  image: p.image || null,
  body: p.body,
  related: p.related,
  status: p.status,
  author: p.author,
  author_type: p.authorType,
});

/**
 * Reads the current site content — defaults with the saved rows overlaid.
 * Memoised per request; the writers below patch the same object so later
 * reads in the request see their change.
 */
export const getSite = cache(async (): Promise<SiteContent> => {
  const db = supabaseAdmin();
  const [settingsRes, layoutsRes, pagesRes, postsRes] = await Promise.all([
    db.from("site_settings").select("key,value"),
    db.from("site_layouts").select("*"),
    db.from("site_pages").select("*").order("slug"),
    db.from("site_posts").select("*").order("date", { ascending: false }),
  ]);
  const settingsRows = unwrap<SettingsRow[]>(settingsRes);
  const layoutRows = unwrap<LayoutRow[]>(layoutsRes);
  const pageRows = unwrap<PageRow[]>(pagesRes);
  const postRows = unwrap<PostRow[]>(postsRes);

  const saved = Object.fromEntries(settingsRows.map((r) => [r.key, r.value])) as Partial<SiteSettings>;
  const settings = { ...defaultSiteContent.settings } as SiteSettings;
  for (const key of Object.keys(defaultSiteContent.settings) as (keyof SiteSettings)[]) {
    const value = saved[key];
    if (value === undefined) continue;
    // arrays replace, objects merge (so newly added default fields still appear)
    (settings as Record<string, unknown>)[key] = Array.isArray(value)
      ? value
      : { ...(defaultSiteContent.settings[key] as object), ...(value as object) };
  }
  const layouts = Object.fromEntries(layoutRows.map((r) => [r.page_key, rowToLayout(r)])) as Partial<Record<LayoutKey, LayoutRecord>>;
  return {
    layouts: {
      home: layouts.home ?? defaultSiteContent.layouts.home,
      offer: layouts.offer ?? defaultSiteContent.layouts.offer,
    },
    pages: pageRows.map(rowToPage),
    posts: postRows.map(rowToPost),
    settings,
  };
});

/* ---------------- audit log — §1.2 "Every write is recorded" ---------------- */

export type AuditEntry = {
  at: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
};

type AuditRow = { at: string; user: string; action: string; entity: string; entity_id: string; summary: string };

export async function audit(entry: Omit<AuditEntry, "at" | "user">) {
  check(
    await supabaseAdmin()
      .from("audit_log")
      .insert({ at: now(), user: ACTOR, action: entry.action, entity: entry.entity, entity_id: entry.entityId, summary: entry.summary }),
  );
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  const rows = unwrap<AuditRow[]>(
    await supabaseAdmin().from("audit_log").select("at,user,action,entity,entity_id,summary").order("at", { ascending: false }).limit(500),
  );
  return rows.map((r) => ({ at: new Date(r.at).toISOString(), user: r.user, action: r.action, entity: r.entity, entityId: r.entity_id, summary: r.summary }));
}

/* ---------------- layouts ---------------- */

export async function getLayout(key: LayoutKey): Promise<LayoutRecord> {
  return (await getSite()).layouts[key];
}

async function saveLayout(key: LayoutKey, rec: LayoutRecord) {
  const site = await getSite();
  site.layouts[key] = rec;
  check(await supabaseAdmin().from("site_layouts").upsert(layoutToRow(key, rec)));
}

export async function saveLayoutDraft(key: LayoutKey, draft: Layout) {
  await saveLayout(key, { ...(await getLayout(key)), draft });
  await audit({ action: "ذخیره پیش‌نویس", entity: "layout", entityId: key, summary: `${draft.sections.length} بخش` });
}

export async function publishLayout(key: LayoutKey, label = "") {
  const rec = await getLayout(key);
  const history = [{ at: now(), label: label || "انتشار", snapshot: rec.published }, ...rec.history].slice(0, 20);
  await saveLayout(key, { draft: rec.draft, published: rec.draft, publishedAt: now(), history });
  await audit({ action: "انتشار", entity: "layout", entityId: key, summary: `${rec.draft.sections.length} بخش منتشر شد` });
}

export async function restoreLayout(key: LayoutKey, index: number) {
  const rec = await getLayout(key);
  const entry = rec.history[index];
  if (!entry) throw new Error("نسخه یافت نشد");
  await saveLayout(key, { ...rec, draft: entry.snapshot });
  await audit({ action: "بازگردانی به پیش‌نویس", entity: "layout", entityId: key, summary: entry.label });
}

/* ---------------- pages ---------------- */

export async function getPage(slug: string): Promise<SitePage | undefined> {
  return (await getSite()).pages.find((p) => p.slug === slug);
}

export async function savePage(page: SitePage) {
  const site = await getSite();
  const i = site.pages.findIndex((p) => p.slug === page.slug);
  if (i >= 0) site.pages[i] = page;
  else site.pages.push(page);
  check(await supabaseAdmin().from("site_pages").upsert(pageToRow(page)));
  await audit({ action: "ذخیره صفحه", entity: "page", entityId: page.slug, summary: page.title });
}

export async function deletePage(slug: string) {
  const site = await getSite();
  site.pages = site.pages.filter((p) => p.slug !== slug);
  check(await supabaseAdmin().from("site_pages").delete().eq("slug", slug));
  await audit({ action: "حذف صفحه", entity: "page", entityId: slug, summary: "" });
}

/* ---------------- posts ---------------- */

export async function getPublishedPosts(): Promise<Post[]> {
  return (await getSite()).posts.filter((p) => p.status === "published").sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function savePost(post: Post, previousSlug?: string) {
  const site = await getSite();
  const key = previousSlug ?? post.slug;
  const i = site.posts.findIndex((p) => p.slug === key);
  if (i >= 0) site.posts[i] = post;
  else site.posts.push(post);
  const db = supabaseAdmin();
  if (previousSlug && previousSlug !== post.slug) check(await db.from("site_posts").delete().eq("slug", previousSlug));
  check(await db.from("site_posts").upsert(postToRow(post)));
  await audit({ action: i >= 0 ? "ویرایش مطلب" : "ایجاد مطلب", entity: "post", entityId: post.slug, summary: post.title });
}

export async function deletePost(slug: string) {
  const site = await getSite();
  site.posts = site.posts.filter((p) => p.slug !== slug);
  check(await supabaseAdmin().from("site_posts").delete().eq("slug", slug));
  await audit({ action: "حذف مطلب", entity: "post", entityId: slug, summary: "" });
}

/* ---------------- settings ---------------- */

export async function saveSettings<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
  const site = await getSite();
  site.settings[key] = value;
  check(await supabaseAdmin().from("site_settings").upsert({ key, value, updated_at: now() }));
  await audit({ action: "ذخیره تنظیمات", entity: "settings", entityId: String(key), summary: "" });
}
