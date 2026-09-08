// Server-only persistence for everything the admin edits besides products:
// layouts, pages, posts, settings. One JSON file (data/site.json) overlaid on
// lib/siteContent.ts defaults, plus an append-only audit log (data/audit.json).
// Never import from a "use client" file — this uses `fs`.
import fs from "node:fs";
import path from "node:path";
import {
  defaultSiteContent,
  type Layout,
  type LayoutRecord,
  type Post,
  type SiteContent,
  type SitePage,
  type SiteSettings,
} from "./siteContent";

const SITE_FILE = path.join(process.cwd(), "data", "site.json");
const AUDIT_FILE = path.join(process.cwd(), "data", "audit.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

type Stored = Partial<{
  layouts: Partial<SiteContent["layouts"]>;
  pages: SitePage[];
  posts: Post[];
  settings: Partial<SiteSettings>;
}>;

/** Reads the current site content — defaults with the saved file overlaid. Cheap; called per request. */
export function getSite(): SiteContent {
  const stored = readJson<Stored>(SITE_FILE, {});
  const settings = { ...defaultSiteContent.settings } as SiteSettings;
  for (const key of Object.keys(defaultSiteContent.settings) as (keyof SiteSettings)[]) {
    const saved = stored.settings?.[key];
    if (saved === undefined) continue;
    // arrays replace, objects merge (so newly added default fields still appear)
    (settings as Record<string, unknown>)[key] = Array.isArray(saved)
      ? saved
      : { ...(defaultSiteContent.settings[key] as object), ...(saved as object) };
  }
  return {
    layouts: {
      home: stored.layouts?.home ?? defaultSiteContent.layouts.home,
      offer: stored.layouts?.offer ?? defaultSiteContent.layouts.offer,
    },
    pages: stored.pages ?? defaultSiteContent.pages,
    posts: stored.posts ?? defaultSiteContent.posts,
    settings,
  };
}

function saveSite(site: SiteContent) {
  writeJson(SITE_FILE, site);
}

/* ---------------- audit log — §1.2 "Every write is recorded" ---------------- */

export type AuditEntry = {
  at: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
};

export function audit(entry: Omit<AuditEntry, "at" | "user">) {
  const log = readJson<AuditEntry[]>(AUDIT_FILE, []);
  log.unshift({ at: new Date().toISOString(), user: "مو (مالک)", ...entry });
  writeJson(AUDIT_FILE, log.slice(0, 500));
}

export function getAuditLog(): AuditEntry[] {
  return readJson<AuditEntry[]>(AUDIT_FILE, []);
}

/* ---------------- layouts ---------------- */

export type LayoutKey = "home" | "offer";

export function getLayout(key: LayoutKey): LayoutRecord {
  return getSite().layouts[key];
}

export function saveLayoutDraft(key: LayoutKey, draft: Layout) {
  const site = getSite();
  site.layouts[key] = { ...site.layouts[key], draft };
  saveSite(site);
  audit({ action: "ذخیره پیش‌نویس", entity: "layout", entityId: key, summary: `${draft.sections.length} بخش` });
}

export function publishLayout(key: LayoutKey, label = "") {
  const site = getSite();
  const rec = site.layouts[key];
  const history = [
    { at: new Date().toISOString(), label: label || "انتشار", snapshot: rec.published },
    ...rec.history,
  ].slice(0, 20);
  site.layouts[key] = { draft: rec.draft, published: rec.draft, publishedAt: new Date().toISOString(), history };
  saveSite(site);
  audit({ action: "انتشار", entity: "layout", entityId: key, summary: `${rec.draft.sections.length} بخش منتشر شد` });
}

export function restoreLayout(key: LayoutKey, index: number) {
  const site = getSite();
  const rec = site.layouts[key];
  const entry = rec.history[index];
  if (!entry) throw new Error("نسخه یافت نشد");
  site.layouts[key] = { ...rec, draft: entry.snapshot };
  saveSite(site);
  audit({ action: "بازگردانی به پیش‌نویس", entity: "layout", entityId: key, summary: entry.label });
}

/* ---------------- pages ---------------- */

export function getPage(slug: string): SitePage | undefined {
  return getSite().pages.find((p) => p.slug === slug);
}

export function savePage(page: SitePage) {
  const site = getSite();
  const i = site.pages.findIndex((p) => p.slug === page.slug);
  if (i >= 0) site.pages[i] = page;
  else site.pages.push(page);
  saveSite(site);
  audit({ action: "ذخیره صفحه", entity: "page", entityId: page.slug, summary: page.title });
}

export function deletePage(slug: string) {
  const site = getSite();
  site.pages = site.pages.filter((p) => p.slug !== slug);
  saveSite(site);
  audit({ action: "حذف صفحه", entity: "page", entityId: slug, summary: "" });
}

/* ---------------- posts ---------------- */

export function getPublishedPosts(): Post[] {
  return getSite()
    .posts.filter((p) => p.status === "published")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function savePost(post: Post, previousSlug?: string) {
  const site = getSite();
  const key = previousSlug ?? post.slug;
  const i = site.posts.findIndex((p) => p.slug === key);
  if (i >= 0) site.posts[i] = post;
  else site.posts.push(post);
  saveSite(site);
  audit({ action: i >= 0 ? "ویرایش مطلب" : "ایجاد مطلب", entity: "post", entityId: post.slug, summary: post.title });
}

export function deletePost(slug: string) {
  const site = getSite();
  site.posts = site.posts.filter((p) => p.slug !== slug);
  saveSite(site);
  audit({ action: "حذف مطلب", entity: "post", entityId: slug, summary: "" });
}

/* ---------------- settings ---------------- */

export function saveSettings<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
  const site = getSite();
  site.settings[key] = value;
  saveSite(site);
  audit({ action: "ذخیره تنظیمات", entity: "settings", entityId: String(key), summary: "" });
}
