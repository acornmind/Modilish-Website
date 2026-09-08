"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { attributeOrder, categories, type Product } from "@/lib/products";
import { deleteProductAction, duplicateProductAction, updateProductAction } from "@/lib/productActions";
import { toast } from "@/lib/toast";
import { faNum, tomanShort } from "@/lib/adminFormat";
import MediaPicker from "./MediaPicker";
import { btnDanger, btnPrimary, btnSoft, Card, ConfirmDialog, Field, inputCls, PageHeader, SaveBar, textareaCls } from "./ui";
import AdminIcon from "../icons";

const materialOptions = categories.filter((c) => c !== "همه");
const statusOptions: { key: NonNullable<Product["status"]>; label: string; hint: string }[] = [
  { key: "published", label: "منتشرشده", hint: "در سایت نمایش داده می‌شود" },
  { key: "draft", label: "پیش‌نویس", hint: "فقط در مدیریت دیده می‌شود" },
  { key: "hidden", label: "پنهان", hint: "با لینک مستقیم باز می‌شود ولی در فهرست‌ها نیست" },
];

type Draft = {
  name: string;
  unit: Product["unit"];
  status: NonNullable<Product["status"]>;
  image: string;
  videoUrl: string;
  price: string;
  salePrice: string;
  meters: string;
  limit: string;
  category: string;
  attrs: Record<string, string>;
  description: string;
};

function toDraft(p: Product): Draft {
  const attrs: Record<string, string> = {};
  for (const a of p.attributes) attrs[a.label] = a.value;
  return {
    name: p.name,
    unit: p.unit,
    status: p.status ?? "published",
    image: p.image,
    videoUrl: p.videoUrl ?? "",
    price: String(p.price),
    salePrice: String(p.salePrice || ""),
    meters: String(p.meters),
    limit: String(p.limit),
    category: p.category,
    attrs,
    description: p.description,
  };
}

const num = (s: string) => Number(String(s).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d.]/g, ""));

/** Product editor — docs/admin-spec.md §4.3.2 (form on the right, live preview on the left). */
export default function ProductEditor({ product }: { product: Product }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(product));
  const [saved, setSaved] = useState<Draft>(() => toDraft(product));
  const [saving, startSave] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setAttr = (label: string, v: string) => setDraft((d) => ({ ...d, attrs: { ...d.attrs, [label]: v } }));

  const price = num(draft.price);
  const salePrice = num(draft.salePrice);
  const discountPct = salePrice > 0 && price > 0 ? Math.round((1 - salePrice / price) * 100) : 0;
  const isMeter = draft.unit === "متر";

  function validate(): string | null {
    if (!draft.name.trim()) return "نام محصول را وارد کنید.";
    if (!Number.isFinite(price) || price <= 0) return "قیمت معتبر نیست.";
    if (salePrice > 0 && salePrice >= price) return "قیمت فروش ویژه باید کمتر از قیمت اصلی باشد.";
    if (!Number.isFinite(num(draft.meters)) || num(draft.meters) < 0) return "موجودی معتبر نیست.";
    if (!Number.isFinite(num(draft.limit)) || num(draft.limit) <= 0) return "حداقل سفارش معتبر نیست.";
    return null;
  }

  function save() {
    const err = validate();
    setError(err);
    if (err) return;
    const attrs: Record<string, string> = { ...draft.attrs, جنس: draft.attrs["جنس"] || draft.category };
    const attributes = attributeOrder
      .filter((l) => (attrs[l] ?? "").trim())
      .map((l) => ({ label: l, value: attrs[l].trim() }));
    startSave(async () => {
      try {
        await updateProductAction(product.slug, {
          name: draft.name.trim(),
          unit: draft.unit,
          status: draft.status,
          image: draft.image.trim() || "/img/box.png",
          videoUrl: draft.videoUrl.trim(),
          price,
          salePrice: salePrice > 0 ? salePrice : 0,
          meters: num(draft.meters),
          limit: num(draft.limit),
          category: draft.category,
          attributes,
          description: draft.description.trim(),
        });
        setSaved(draft);
        toast("ذخیره شد");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "ذخیره نشد");
      }
    });
  }

  function generateDescription() {
    const a = draft.attrs;
    const parts = [
      `پارچه ${draft.name.trim() || product.name} از جنس ${a["جنس"] || draft.category}${a["عرض"] ? ` با عرض ${a["عرض"]}` : ""}.`,
      a["طرح"] ? `طرح: ${a["طرح"]}.` : "",
      a["ایستایی"] ? `ایستایی پارچه ${a["ایستایی"]} است.` : "",
      a["کاربرد"] ? `مناسب برای ${a["کاربرد"]}.` : "",
      a["رنگ‌ها"] ? `رنگ‌بندی: ${a["رنگ‌ها"]}.` : "",
      a["زمان استفاده"] ? `زمان استفاده: ${a["زمان استفاده"]}.` : "",
    ].filter(Boolean);
    set("description", parts.join(" "));
  }

  return (
    <div>
      <PageHeader
        title={saved.name}
        subtitle={`کد ${product.slug} · ${isMeter ? "متری" : "عددی"}`}
        back={{ href: "/admin/products", label: "محصولات" }}
        actions={
          <>
            <Link href={`/product/${product.slug}?preview=1`} target="_blank" className={btnSoft}>
              <AdminIcon name="external" size={14} /> مشاهده در سایت
            </Link>
            <button
              type="button"
              className={btnSoft}
              onClick={() =>
                startSave(async () => {
                  const { slug } = await duplicateProductAction(product.slug);
                  toast("کپی ساخته شد");
                  router.push(`/admin/products/${slug}`);
                })
              }
            >
              کپی محصول
            </button>
            <button type="button" className={btnDanger} onClick={() => setConfirmDelete(true)}>
              حذف
            </button>
          </>
        }
      />

      {error && <p className="mb-3 rounded-xl bg-modi-danger-bg px-3 py-2 text-xs font-bold text-modi-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-4">
          <Card title="اطلاعات پایه">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Field label="نام" required className="lg:col-span-2">
                <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              </Field>
              <Field label="کد محصول / SKU" hint="کد، آدرس صفحه است (/product/…) و پس از ایجاد ثابت می‌ماند.">
                <input value={product.slug} readOnly dir="ltr" className={`${inputCls} text-left opacity-70`} />
              </Field>
              <Field label="نوع فروش">
                <div className="flex gap-2">
                  {(["متر", "عدد"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => set("unit", u)}
                      className={`h-10 flex-1 rounded-xl text-sm font-bold ${draft.unit === u ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}
                    >
                      {u === "متر" ? "متری" : "عددی"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="وضعیت" className="lg:col-span-2">
                <div className="grid grid-cols-3 gap-2">
                  {statusOptions.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => set("status", s.key)}
                      className={`rounded-xl px-2 py-2 text-start ${draft.status === s.key ? "bg-modi-purple-800 text-white" : "bg-modi-gray-300"}`}
                    >
                      <span className="block text-xs font-bold">{s.label}</span>
                      <span className={`block text-[10px] ${draft.status === s.key ? "text-white/80" : "text-modi-gray-900"}`}>{s.hint}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Card>

          <Card title="رسانه">
            <MediaPicker value={draft.image} onChange={(v) => set("image", v)} label="تصویر اصلی (مربع، ۱۲۰۰×۱۲۰۰)" />
            <Field label="ویدیو معرفی پارچه" hint="لینک آپارات، یوتیوب یا فایل mp4 — دکمهٔ «ویدیو معرفی پارچه» در صفحه محصول فقط با این لینک فعال می‌شود." className="mt-3">
              <input value={draft.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} dir="ltr" placeholder="https://www.aparat.com/v/…" className={`${inputCls} text-left`} />
            </Field>
          </Card>

          <Card title="قیمت">
            <div className="grid grid-cols-2 gap-3">
              <Field label={`قیمت (تومان / هر ${draft.unit})`} required>
                <input value={draft.price} onChange={(e) => set("price", e.target.value)} inputMode="numeric" className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="قیمت فروش ویژه" hint={discountPct > 0 ? `${faNum(discountPct)}٪ تخفیف` : "خالی = بدون تخفیف"}>
                <input value={draft.salePrice} onChange={(e) => set("salePrice", e.target.value)} inputMode="numeric" className={`${inputCls} tabular-nums`} />
              </Field>
            </div>
          </Card>

          <Card title="موجودی">
            <div className="grid grid-cols-2 gap-3">
              <Field label={`موجودی (${draft.unit})`} required>
                <input value={draft.meters} onChange={(e) => set("meters", e.target.value)} inputMode="decimal" className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label={`حداقل سفارش (${draft.unit})`} required hint={isMeter ? "پیش‌فرض ۰٫۵ متر؛ گام انتخاب ۱۰ سانتی‌متر" : "پیش‌فرض ۱ عدد"}>
                <input value={draft.limit} onChange={(e) => set("limit", e.target.value)} inputMode="decimal" className={`${inputCls} tabular-nums`} />
              </Field>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-modi-gray-900">
              با رسیدن موجودی به صفر، محصول با برچسب «ناموجود» می‌ماند و دکمه خرید غیرفعال می‌شود. آستانه هشدار موجودی کم: ۲ {draft.unit}.
            </p>
          </Card>

          <Card title="مشخصات پارچه">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Field label="خانواده جنس" required hint="منو، فیلترها و صفحه /materials را می‌سازد">
                <select value={draft.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                  {materialOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              {attributeOrder.map((label) => (
                <Field key={label} label={label} hint={label === "جنس" ? "جنس دقیق، مثلاً «کتان گاباردین»" : label === "عرض" ? "مثلاً «۱۵۰ سانتی‌متر»" : label === "طرح" || label === "کاربرد" || label === "رنگ‌ها" || label === "زمان استفاده" ? "چند مقدار را با «،» جدا کنید" : undefined}>
                  <input value={draft.attrs[label] ?? ""} onChange={(e) => setAttr(label, e.target.value)} className={inputCls} />
                </Field>
              ))}
            </div>
          </Card>

          <Card
            title="توضیحات"
            action={
              <button type="button" onClick={generateDescription} className={`${btnSoft} h-8 text-xs`}>
                تولید خودکار
              </button>
            }
          >
            <textarea value={draft.description} onChange={(e) => set("description", e.target.value)} className={textareaCls} />
          </Card>

          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary}>
              {saving ? "در حال ذخیره…" : draft.status === "published" ? "ذخیره و انتشار" : "ذخیره"}
            </button>
            {dirty && (
              <button type="button" onClick={() => setDraft(saved)} className={btnSoft}>
                انصراف
              </button>
            )}
          </div>
        </div>

        {/* live preview — how the card renders on the storefront */}
        <div className="lg:sticky lg:top-24">
          <Card title="پیش‌نمایش کارت محصول">
            <div className="product mx-auto flex w-44 flex-col rounded-2xl bg-white p-2.5 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-modi-gray-300">
                {draft.image && <Image src={draft.image} alt="" fill sizes="176px" className="object-cover" />}
                {discountPct > 0 && (
                  <span className="absolute right-2 top-2 rounded-lg bg-[#C40000] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {faNum(discountPct)}٪
                  </span>
                )}
              </div>
              <h2>{draft.name || "نام محصول"}</h2>
              <div className="price">
                {salePrice > 0 && <del className="ml-1 text-[11px] text-modi-gray-900">{tomanShort(price)}</del>}
                {tomanShort(salePrice > 0 ? salePrice : price)}
              </div>
              <span className="add_to_cart_button">ثبت سفارش</span>
            </div>
            <dl className="mt-4 space-y-1 text-[11px] text-modi-gray-900">
              <div className="flex justify-between"><dt>وضعیت</dt><dd>{statusOptions.find((s) => s.key === draft.status)?.label}</dd></div>
              <div className="flex justify-between"><dt>موجودی</dt><dd className="tabular-nums">{faNum(num(draft.meters) || 0)} {draft.unit}</dd></div>
              <div className="flex justify-between"><dt>خانواده</dt><dd>{draft.category}</dd></div>
            </dl>
          </Card>
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={save} onCancel={() => setDraft(saved)} />

      <ConfirmDialog
        open={confirmDelete}
        title={`«${saved.name}» حذف شود؟`}
        text="محصول از سایت و فهرست‌ها برداشته می‌شود. این کار قابل بازگشت نیست."
        confirmLabel="حذف محصول"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          startSave(async () => {
            await deleteProductAction(product.slug);
            toast("محصول حذف شد");
            router.push("/admin/products");
          })
        }
      />
    </div>
  );
}
