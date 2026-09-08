"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Post } from "@/lib/siteContent";
import { deletePostAction, savePostAction } from "@/lib/siteActions";
import { toast } from "@/lib/toast";
import { faNum } from "@/lib/adminFormat";
import MediaPicker from "./MediaPicker";
import AdminIcon from "../icons";
import { btnDanger, btnPrimary, btnSoft, Card, ConfirmDialog, Field, inputCls, LinkList, PageHeader, SaveBar, StringList, textareaCls } from "./ui";

const slugify = (s: string) => s.trim().replace(/\s+/g, "-").replace(/[^\w؀-ۿ-]+/g, "");

/** Magazine post editor — docs/admin-spec.md §4.7. */
export default function PostEditor({ post, isNew, existingSlugs }: { post: Post; isNew?: boolean; existingSlugs: string[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Post>(post);
  const [saved, setSaved] = useState<Post>(post);
  const [savedSlug, setSavedSlug] = useState(isNew ? "" : post.slug);
  const [saving, startSaving] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof Post>(k: K, v: Post[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function save(status?: Post["status"]) {
    const next = { ...draft, status: status ?? draft.status, slug: slugify(draft.slug) || slugify(draft.title) };
    if (!next.title.trim()) return setError("عنوان را وارد کنید.");
    if (!next.slug) return setError("نامک (آدرس) را وارد کنید.");
    if (next.slug !== savedSlug && existingSlugs.includes(next.slug)) return setError("این نامک قبلاً استفاده شده است.");
    if (!next.excerpt.trim()) return setError("خلاصه را وارد کنید.");
    setError(null);
    startSaving(async () => {
      try {
        await savePostAction(next, savedSlug || undefined);
        setDraft(next);
        setSaved(next);
        setSavedSlug(next.slug);
        toast(next.status === "published" ? "منتشر شد" : "پیش‌نویس ذخیره شد");
        if (isNew || next.slug !== post.slug) router.replace(`/admin/magazine/${encodeURIComponent(next.slug)}`);
        else router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "ذخیره نشد");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title={isNew ? "نوشتن مطلب" : saved.title}
        subtitle={`${saved.status === "published" ? "منتشرشده" : "پیش‌نویس"} · ${saved.author}${saved.authorType === "agent" ? " · AI" : ""}`}
        back={{ href: "/admin/magazine", label: "مجله" }}
        actions={
          <>
            {savedSlug && (
              <Link href={`/magazine/${encodeURIComponent(savedSlug)}?preview=1`} target="_blank" className={btnSoft}>
                <AdminIcon name="external" size={14} /> پیش‌نمایش
              </Link>
            )}
            {!isNew && (
              <button type="button" onClick={() => setConfirmDelete(true)} className={btnDanger}>
                حذف
              </button>
            )}
          </>
        }
      />
      {saved.authorType === "agent" && saved.status !== "published" && (
        <p className="mb-3 rounded-xl bg-modi-warning-bg px-3 py-2 text-xs font-bold text-modi-warning">
          نوشته‌شده توسط {saved.author} — پیش از انتشار بازبینی کنید
        </p>
      )}
      {error && <p className="mb-3 rounded-xl bg-modi-danger-bg px-3 py-2 text-xs font-bold text-modi-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-4">
          <Card>
            <div className="space-y-3">
              <Field label="عنوان" required>
                <input
                  value={draft.title}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (!slugTouched) set("slug", slugify(e.target.value));
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="نامک (آدرس)" required hint={`/magazine/${draft.slug || "…"}`}>
                <input
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value);
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="خلاصه" required hint={`${faNum(draft.excerpt.length)} / ۱۶۰ کاراکتر — روی کارت مجله و صفحه اصلی نمایش داده می‌شود`}>
                <textarea value={draft.excerpt} onChange={(e) => set("excerpt", e.target.value.slice(0, 200))} className={`${textareaCls} min-h-20`} />
              </Field>
            </div>
          </Card>

          <Card title="تصویر شاخص">
            <MediaPicker value={draft.image} onChange={(v) => set("image", v)} label="" />
          </Card>

          <Card title="متن" >
            <p className="mb-2 text-[11px] text-modi-gray-900">هر پاراگراف یک بلوک. اگر پاراگراف با «عنوان:» شروع شود، عنوان پررنگ می‌شود.</p>
            <StringList items={draft.body} onChange={(v) => set("body", v)} multiline placeholder="پاراگراف…" />
          </Card>

          <Card title="پارچه‌های مرتبط">
            <LinkList items={draft.related} onChange={(v) => set("related", v)} />
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card title="انتشار">
            <div className="space-y-3">
              <Field label="تاریخ انتشار">
                <input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} dir="ltr" className={inputCls} />
              </Field>
              <Field label="زمان مطالعه (دقیقه)">
                <input type="number" min={1} value={draft.readMinutes} onChange={(e) => set("readMinutes", Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
              </Field>
              <Field label="نویسنده">
                <input value={draft.author} onChange={(e) => set("author", e.target.value)} className={inputCls} />
              </Field>
              <div className="flex flex-col gap-2 pt-1">
                <button type="button" onClick={() => save("published")} disabled={saving} className={btnPrimary}>
                  {saving ? "…" : draft.status === "published" && !dirty ? "منتشرشده" : "انتشار"}
                </button>
                <button type="button" onClick={() => save("draft")} disabled={saving} className={btnSoft}>
                  ذخیره پیش‌نویس
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={() => save()} onCancel={() => setDraft(saved)} />
      <ConfirmDialog
        open={confirmDelete}
        title={`«${saved.title}» حذف شود؟`}
        text="مطلب از مجله برداشته می‌شود."
        confirmLabel="حذف مطلب"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          startSaving(async () => {
            await deletePostAction(savedSlug);
            toast("مطلب حذف شد");
            router.push("/admin/magazine");
          })
        }
      />
    </div>
  );
}
