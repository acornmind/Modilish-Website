"use server";

import { revalidatePath } from "next/cache";
import type { Layout, Post, SitePage, SiteSettings } from "./siteContent";
import {
  deletePage,
  deletePost,
  publishLayout,
  restoreLayout,
  saveLayoutDraft,
  savePage,
  savePost,
  saveSettings,
  type LayoutKey,
} from "./siteStore";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function saveLayoutDraftAction(key: LayoutKey, draft: Layout) {
  saveLayoutDraft(key, draft);
  revalidatePath(key === "home" ? "/" : "/offer");
  revalidatePath(`/admin/${key}`);
}

export async function publishLayoutAction(key: LayoutKey, label?: string) {
  publishLayout(key, label);
  revalidateAll();
}

export async function restoreLayoutAction(key: LayoutKey, index: number) {
  restoreLayout(key, index);
  revalidatePath(`/admin/${key}`);
}

export async function savePageAction(page: SitePage) {
  savePage(page);
  revalidateAll();
}

export async function deletePageAction(slug: string) {
  deletePage(slug);
  revalidateAll();
}

export async function savePostAction(post: Post, previousSlug?: string) {
  savePost(post, previousSlug);
  revalidateAll();
}

export async function deletePostAction(slug: string) {
  deletePost(slug);
  revalidateAll();
}

export async function saveSettingsAction<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
  saveSettings(key, value);
  revalidateAll();
}
