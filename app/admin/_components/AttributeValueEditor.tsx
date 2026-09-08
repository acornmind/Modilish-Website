"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AttributeMeta } from "@/lib/siteContent";
import { metaKey, type AttributeType } from "@/lib/attributes";
import { renameAttributeValueAction } from "@/lib/productActions";
import { saveSettingsAction } from "@/lib/siteActions";
import { faNum } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import MediaPicker from "./MediaPicker";
import { btnDanger, btnPrimary, btnSoft, Card, ConfirmDialog, Field, inputCls, PageHeader, SaveBar, textareaCls, Toggle } from "./ui";

export default function AttributeValueEditor({ type, typeLabel, name, count, siblings, meta: m0, allMeta, siteHref }: {
  type: AttributeType;
  typeLabel: string;
  name: string;
  count: number;
  siblings: string[];
  meta: AttributeMeta;
  allMeta: Record<string, AttributeMeta>;
  siteHref: string;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState(name);
  const [mergeInto, setMergeInto] = useState("");
  const [confirm, setConfirm] = useState<null | "rename" | "merge">(null);
  const [meta, setMeta] = useState(m0);
  const [saved, setSaved] = useState(m0);
  const [pending, start] = useTransition();
  const menuDim = type === "material" || type === "pattern" || type === "usage";
  const dirty = JSON.stringify(meta) !== JSON.stringify(saved);

  const rename = (to: string) =>
    start(async () => {
      try {
        const { touched } = await renameAttributeValueAction(type, name, to);
        // carry the page text/menu settings over to the new name
        const next = { ...allMeta };
        delete next[metaKey(type, name)];
        if (!next[metaKey(type, to)]) next[metaKey(type, to)] = saved;
        await saveSettingsAction("attributeMeta", next);
        toast(`${faNum(touched)} محصول به «${to}» منتقل شد`);
        setConfirm(null);
        router.replace(`/admin/attributes/${type}/${encodeURIComponent(to)}`);
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "انجام نشد");
      }
    });

  const saveMeta = () =>
    start(async () => {
      await saveSettingsAction("attributeMeta", { ...allMeta, [metaKey(type, name)]: meta });
      setSaved(meta);
      toast("ذخیره شد — روی سایت اعمال شد");
      router.refresh();
    });

  return (
    <div>
      <PageHeader
        title={name}
        subtitle={`${typeLabel} · ${faNum(count)} محصول`}
        back={{ href: "/admin/attributes", label: "ویژگی‌های پارچه" }}
        actions={
          <>
            <Link href={`/admin/products?q=${encodeURIComponent(name)}`} className={btnSoft}>محصولات این مقدار</Link>
            <Link href={siteHref} target="_blank" className={btnSoft}>مشاهده در سایت</Link>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Card title="تغییر نام">
            <p className="mb-2 text-[11px] leading-5 text-modi-gray-900">نام در مشخصات همه {faNum(count)} محصول عوض می‌شود؛ آدرس صفحه‌های سایت هم تغییر می‌کند.</p>
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} />
              <button type="button" disabled={pending || !newName.trim() || newName.trim() === name} onClick={() => setConfirm("rename")} className={`${btnPrimary} shrink-0`}>تغییر نام</button>
            </div>
            {siblings.includes(newName.trim()) && newName.trim() !== name && <p className="mt-2 text-[11px] text-modi-warning">«{newName.trim()}» از قبل وجود دارد — تغییر نام آن‌ها را ادغام می‌کند.</p>}
          </Card>
          <Card title="ادغام با مقدار دیگر">
            <p className="mb-2 text-[11px] leading-5 text-modi-gray-900">برای یکی‌کردن املاهای مختلف (مثلاً «کرپ حریر» و «کرپ‌حریر»). محصولات این مقدار به مقدار انتخابی منتقل می‌شوند و این مقدار حذف می‌شود.</p>
            <div className="flex gap-2">
              <select value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} className={inputCls}>
                <option value="">انتخاب مقدار مقصد…</option>
                {siblings.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" disabled={pending || !mergeInto} onClick={() => setConfirm("merge")} className={`${btnDanger} shrink-0`}>ادغام</button>
            </div>
          </Card>
        </div>

        <Card title={menuDim ? "نمایش در منو و صفحه سایت" : "صفحه سایت"}>
          <div className="space-y-3">
            {menuDim && (
              <>
                <Toggle checked={meta.showInMenu} onChange={(showInMenu) => setMeta({ ...meta, showInMenu })} label="نمایش در مگامنو" hint="با خاموش‌کردن، از منوی هدر حذف می‌شود ولی صفحه‌اش باز می‌ماند" />
                <Field label="ترتیب در منو (۰ = بر اساس تعداد محصول)"><input type="number" min={0} value={meta.position} onChange={(e) => setMeta({ ...meta, position: Number(e.target.value) || 0 })} className={`${inputCls} w-28 tabular-nums`} /></Field>
              </>
            )}
            {type === "material" && (
              <>
                <MediaPicker value={meta.image} onChange={(image) => setMeta({ ...meta, image })} label="تصویر بالای صفحه جنس" />
                <Field label="متن معرفی بالای فهرست" hint="یک پاراگراف کوتاه: ویژگی‌ها، کاربردها، نکته نگه‌داری"><textarea value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} className={textareaCls} /></Field>
              </>
            )}
            <Field label="عنوان سئو" hint="خالی = قالب پیش‌فرض تنظیمات → سئو"><input value={meta.seoTitle} onChange={(e) => setMeta({ ...meta, seoTitle: e.target.value })} className={inputCls} /></Field>
            <Field label="توضیح متا"><textarea value={meta.seoDescription} onChange={(e) => setMeta({ ...meta, seoDescription: e.target.value })} className={`${textareaCls} min-h-16`} /></Field>
            {type !== "material" && <p className="text-[11px] text-modi-gray-900">این مقدار صفحه اختصاصی ندارد؛ عنوان و توضیح سئو برای فیلتر فروشگاه نگه داشته می‌شود.</p>}
          </div>
        </Card>
      </div>
      <SaveBar dirty={dirty} saving={pending} onSave={saveMeta} onCancel={() => setMeta(saved)} />
      <ConfirmDialog
        open={confirm === "rename"}
        title={`«${name}» به «${newName.trim()}» تغییر کند؟`}
        text={`${faNum(count)} محصول به‌روزرسانی می‌شود.`}
        confirmLabel="تغییر نام"
        onCancel={() => setConfirm(null)}
        onConfirm={() => rename(newName.trim())}
      />
      <ConfirmDialog
        open={confirm === "merge"}
        title={`«${name}» با «${mergeInto}» ادغام شود؟`}
        text={`${faNum(count)} محصول به «${mergeInto}» منتقل و «${name}» حذف می‌شود. این کار برگشت‌پذیر نیست.`}
        confirmLabel="ادغام"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => rename(mergeInto)}
      />
    </div>
  );
}
