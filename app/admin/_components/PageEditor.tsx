"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { pageHref, type SitePage } from "@/lib/siteContent";
import { deletePageAction, savePageAction } from "@/lib/siteActions";
import { toast } from "@/lib/toast";
import MediaPicker from "./MediaPicker";
import AdminIcon from "../icons";
import { btnDanger, btnPrimary, btnSoft, Card, ConfirmDialog, Field, inputCls, PageHeader, SaveBar, StringList, Toggle } from "./ui";

const builtIn = new Set(["about", "contact", "guide", "faq", "terms", "privacy", "guarantee"]);

/** Page editor — docs/admin-spec.md §4.8 (about / contact have their own fields). */
export default function PageEditor({ page, isNew, existingSlugs }: { page: SitePage; isNew?: boolean; existingSlugs: string[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SitePage>(page);
  const [saved, setSaved] = useState<SitePage>(page);
  const [saving, startSaving] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof SitePage>(k: K, v: SitePage[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function save() {
    const slug = draft.slug.trim().replace(/\s+/g, "-");
    if (!draft.title.trim()) return setError("عنوان را وارد کنید.");
    if (!slug) return setError("نامک را وارد کنید.");
    if (isNew && existingSlugs.includes(slug)) return setError("این نامک قبلاً استفاده شده است.");
    setError(null);
    const next = { ...draft, slug };
    startSaving(async () => {
      try {
        await savePageAction(next);
        setDraft(next);
        setSaved(next);
        toast("ذخیره شد");
        if (isNew) router.replace(`/admin/pages/${encodeURIComponent(slug)}`);
        else router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "ذخیره نشد");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title={isNew ? "صفحه جدید" : saved.title}
        subtitle={pageHref(saved.slug)}
        back={{ href: "/admin/pages", label: "صفحات" }}
        actions={
          <>
            {!isNew && (
              <Link href={pageHref(saved.slug)} target="_blank" className={btnSoft}>
                <AdminIcon name="external" size={14} /> مشاهده در سایت
              </Link>
            )}
            {!isNew && !builtIn.has(saved.slug) && (
              <button type="button" onClick={() => setConfirmDelete(true)} className={btnDanger}>
                حذف
              </button>
            )}
          </>
        }
      />
      {error && <p className="mb-3 rounded-xl bg-modi-danger-bg px-3 py-2 text-xs font-bold text-modi-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-4">
          <Card>
            <div className="space-y-3">
              <Field label="عنوان" required>
                <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
              </Field>
              {isNew && (
                <Field label="نامک (آدرس)" required hint={`/pages/${draft.slug || "…"}`}>
                  <input value={draft.slug} onChange={(e) => set("slug", e.target.value)} dir="ltr" className={`${inputCls} text-left`} />
                </Field>
              )}
            </div>
          </Card>

          {draft.slug !== "contact" && (
            <Card title={draft.slug === "about" ? "تصویر" : "تصویر (اختیاری)"}>
              <MediaPicker value={draft.image ?? ""} onChange={(v) => set("image", v)} label="" />
            </Card>
          )}

          <Card title={draft.slug === "about" ? "متن معرفی" : draft.slug === "contact" ? "متن بالای اطلاعات تماس" : "متن"}>
            <StringList items={draft.body} onChange={(v) => set("body", v)} multiline placeholder="پاراگراف…" />
          </Card>

          {draft.slug === "about" && (
            <Card title="ویژگی‌های متمایز" >
              <p className="mb-2 text-[11px] text-modi-gray-900">فهرست تیک‌دار زیر متن (ارسال رایگان، پرداخت امن، …)</p>
              <StringList items={draft.bullets ?? []} onChange={(v) => set("bullets", v)} placeholder="مثلاً ارسال رایگان" />
            </Card>
          )}
          {draft.slug !== "about" && draft.slug !== "contact" && (
            <Card title="فهرست (اختیاری)">
              <StringList items={draft.bullets ?? []} onChange={(v) => set("bullets", v)} placeholder="مورد…" />
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card title="انتشار">
            <Toggle checked={draft.status === "published"} onChange={(v) => set("status", v ? "published" : "draft")} label="منتشرشده" hint="خاموش = صفحه در سایت باز نمی‌شود" />
            {draft.slug === "about" && (
              <Toggle checked={!!draft.showCircles} onChange={(v) => set("showCircles", v)} label="نوار دسته‌های منتخب" hint="همان دایره‌های صفحه اصلی" />
            )}
            {draft.slug === "contact" && (
              <Toggle checked={!!draft.showContact} onChange={(v) => set("showContact", v)} label="نمایش اطلاعات تماس" hint="از تنظیمات → فروشگاه خوانده می‌شود" />
            )}
            <div className="mt-3 flex flex-col gap-2">
              <button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary}>
                {saving ? "…" : "ذخیره"}
              </button>
            </div>
          </Card>
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={save} onCancel={() => setDraft(saved)} />
      <ConfirmDialog
        open={confirmDelete}
        title={`«${saved.title}» حذف شود؟`}
        confirmLabel="حذف صفحه"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          startSaving(async () => {
            await deletePageAction(saved.slug);
            toast("صفحه حذف شد");
            router.push("/admin/pages");
          })
        }
      />
    </div>
  );
}
