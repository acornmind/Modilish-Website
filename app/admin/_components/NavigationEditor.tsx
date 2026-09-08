"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SiteSettings } from "@/lib/siteContent";
import { saveSettingsAction } from "@/lib/siteActions";
import { toast } from "@/lib/toast";
import AdminIcon from "../icons";
import { btnPrimary, btnSoft, Card, Field, inputCls, LinkList, PageHeader, SaveBar, textareaCls, Toggle } from "./ui";

/** منو و فوتر — docs/admin-spec.md §4.12 (main menu, mega-menu sizes, footer, header/announcement). */
export default function NavigationEditor({ header, footer }: { header: SiteSettings["header"]; footer: SiteSettings["footer"] }) {
  const router = useRouter();
  const [h, setH] = useState(header);
  const [f, setF] = useState(footer);
  const [saved, setSaved] = useState({ h: header, f: footer });
  const [saving, startSaving] = useTransition();
  const dirty = JSON.stringify({ h, f }) !== JSON.stringify(saved);

  function save() {
    startSaving(async () => {
      try {
        await saveSettingsAction("header", h);
        await saveSettingsAction("footer", f);
        setSaved({ h, f });
        toast("ذخیره شد — روی سایت اعمال شد");
        router.refresh();
      } catch {
        toast("ذخیره نشد");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="منو و فوتر"
        subtitle="منوی اصلی، مگامنو، فوتر و نوار اعلان بالای سایت"
        actions={
          <>
            <Link href="/" target="_blank" className={btnSoft}>
              <AdminIcon name="external" size={14} /> مشاهده سایت
            </Link>
            <button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary}>
              {saving ? "…" : "ذخیره"}
            </button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Card title="منوی اصلی">
            <p className="mb-2 text-[11px] text-modi-gray-900">«دسته‌بندی» همیشه اول است. لینکی که آدرس آن /shop باشد به‌صورت دکمه بنفش نمایش داده می‌شود.</p>
            <LinkList items={h.menuItems} onChange={(v) => setH({ ...h, menuItems: v })} />
          </Card>
          <Card title="مگامنوی دسته‌بندی">
            <div className="grid grid-cols-2 gap-3">
              <Field label="تعداد در دسکتاپ" hint="برای هر یک از جنس / طرح / کاربرد">
                <input type="number" min={3} max={20} value={h.megaDesktop} onChange={(e) => setH({ ...h, megaDesktop: Number(e.target.value) || 8 })} className={inputCls} />
              </Field>
              <Field label="تعداد در موبایل">
                <input type="number" min={3} max={30} value={h.megaMobile} onChange={(e) => setH({ ...h, megaMobile: Number(e.target.value) || 14 })} className={inputCls} />
              </Field>
            </div>
            <p className="mt-2 text-[11px] text-modi-gray-900">ترتیب مقادیر بر اساس تعداد محصول است (ویژگی‌های پارچه).</p>
          </Card>
          <Card title="هدر">
            <Field label="متن جستجو">
              <input value={h.searchPlaceholder} onChange={(e) => setH({ ...h, searchPlaceholder: e.target.value })} className={inputCls} />
            </Field>
            <div className="mt-3">
              <Toggle checked={h.announcement.enabled} onChange={(v) => setH({ ...h, announcement: { ...h.announcement, enabled: v } })} label="نوار اعلان بالای سایت" hint="یک خط بنفش بالای هدر، مثلاً «ارسال رایگان تا پایان هفته»" />
              {h.announcement.enabled && (
                <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <Field label="متن">
                    <input value={h.announcement.text} onChange={(e) => setH({ ...h, announcement: { ...h.announcement, text: e.target.value } })} className={inputCls} />
                  </Field>
                  <Field label="لینک">
                    <input value={h.announcement.href} onChange={(e) => setH({ ...h, announcement: { ...h.announcement, href: e.target.value } })} dir="ltr" className={`${inputCls} text-left`} />
                  </Field>
                </div>
              )}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="فوتر">
            <div className="space-y-3">
              <Field label="عنوان ستون درباره">
                <input value={f.aboutTitle} onChange={(e) => setF({ ...f, aboutTitle: e.target.value })} className={inputCls} />
              </Field>
              <Field label="متن «درباره مدیلیش»">
                <textarea value={f.boilerplate} onChange={(e) => setF({ ...f, boilerplate: e.target.value })} className={textareaCls} />
              </Field>
              <Toggle checked={f.showEnamad} onChange={(v) => setF({ ...f, showEnamad: v })} label="نماد اعتماد الکترونیکی" />
            </div>
          </Card>
          <Card title="لینک‌های پرکاربرد">
            <p className="mb-2 text-[11px] text-modi-gray-900">صفحات حقوقی: /pages/faq، /pages/terms، /pages/privacy، /pages/guarantee</p>
            <LinkList items={f.quickLinks} onChange={(v) => setF({ ...f, quickLinks: v })} />
          </Card>
          <p className="text-[11px] leading-5 text-modi-gray-900">
            تلگرام پشتیبانی، تلفن، ساعات کاری و متن کپی‌رایت فوتر از{" "}
            <Link href="/admin/settings" className="text-modi-purple-800">تنظیمات → فروشگاه</Link> خوانده می‌شود.
          </p>
        </div>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onCancel={() => { setH(saved.h); setF(saved.f); }} />
    </div>
  );
}
