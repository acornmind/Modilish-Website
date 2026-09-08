"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import type { ImportRow } from "@/lib/productStore";
import { importProductsAction } from "@/lib/productActions";
import { faNum } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import { btnPrimary, btnSoft, Card, Field, inputCls, PageHeader, textareaCls } from "./ui";

type FieldKey = keyof ImportRow;

const fields: { key: FieldKey; label: string; required?: boolean; aliases: string[] }[] = [
  { key: "code", label: "کد محصول", required: true, aliases: ["code", "sku", "کد", "کد محصول", "slug"] },
  { key: "name", label: "نام", required: true, aliases: ["name", "title", "نام", "عنوان", "نام محصول"] },
  { key: "material", label: "جنس", required: true, aliases: ["material", "category", "جنس", "دسته", "دسته‌بندی"] },
  { key: "detail", label: "جنس دقیق", aliases: ["detail", "جنس دقیق", "ترکیب"] },
  { key: "patterns", label: "طرح", aliases: ["patterns", "pattern", "طرح"] },
  { key: "stance", label: "ایستایی", aliases: ["stance", "ایستایی"] },
  { key: "width", label: "عرض", aliases: ["width", "عرض"] },
  { key: "colors", label: "رنگ‌ها", aliases: ["colors", "color", "رنگ", "رنگ‌ها", "رنگها"] },
  { key: "usages", label: "کاربرد", aliases: ["usages", "usage", "کاربرد"] },
  { key: "seasons", label: "زمان استفاده", aliases: ["seasons", "season", "فصل", "زمان استفاده"] },
  { key: "price", label: "قیمت (تومان)", required: true, aliases: ["price", "قیمت", "قیمت (تومان)"] },
  { key: "salePrice", label: "قیمت فروش ویژه", aliases: ["saleprice", "sale_price", "sale", "قیمت ویژه", "قیمت فروش ویژه", "تخفیف"] },
  { key: "stock", label: "موجودی", required: true, aliases: ["stock", "meters", "qty", "موجودی", "متراژ"] },
  { key: "minOrder", label: "حداقل سفارش", aliases: ["minorder", "min_order", "limit", "حداقل", "حداقل سفارش"] },
  { key: "unit", label: "واحد (متر / عدد)", aliases: ["unit", "واحد"] },
  { key: "description", label: "توضیحات", aliases: ["description", "توضیحات", "توضیح"] },
  { key: "image", label: "آدرس تصویر", aliases: ["image", "img", "photo", "تصویر", "عکس"] },
];

/** Minimal CSV parser: quotes, escaped quotes, comma / semicolon / tab, BOM. */
function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/)[0] ?? "";
  const delim = [",", ";", "\t"].map((d) => ({ d, n: firstLine.split(d).length })).sort((a, b) => b.n - a.n)[0].d;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const toNum = (s: string) => Number(String(s).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d.]/g, ""));
const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, "");

const templateCsv = () =>
  "﻿" + [fields.map((f) => f.key).join(","), ["1101", "کرپ حریر نقره‌ای", "کرپ", "کرپ حریر", "ساده", "نرم", "۱۵۰", "نقره‌ای، طوسی", "شومیز، مانتو", "بهار، تابستان", "185000", "0", "24", "1", "متر", "توضیح کوتاه", ""].join(",")].join("\r\n");

export default function ImportWizard({ existingCodes, materials }: { existingCodes: string[]; materials: string[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [raw, setRaw] = useState("");
  const [table, setTable] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, number>>>({});
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; updated: number; errors: { code: string; message: string }[] } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const header = table[0] ?? [];
  const body = useMemo(() => table.slice(1), [table]);

  const load = (text: string) => {
    const t = parseCsv(text);
    if (t.length < 2) return toast("فایل باید یک ردیف عنوان و دست‌کم یک ردیف داده داشته باشد");
    setTable(t);
    // auto-map by header aliases
    const m: Partial<Record<FieldKey, number>> = {};
    t[0].forEach((h, i) => {
      const f = fields.find((f) => f.aliases.some((a) => norm(a) === norm(h)));
      if (f && m[f.key] === undefined) m[f.key] = i;
    });
    setMapping(m);
    setStep(2);
  };

  const rows = useMemo<{ row: ImportRow; problems: string[]; isNew: boolean }[]>(() => {
    if (step < 3 && step !== 2) return [];
    return body.map((cells) => {
      const get = (k: FieldKey) => (mapping[k] === undefined ? "" : (cells[mapping[k] as number] ?? "").trim());
      const unitRaw = get("unit");
      const row: ImportRow = {
        code: get("code"),
        name: get("name"),
        material: get("material"),
        detail: get("detail") || undefined,
        patterns: get("patterns") || undefined,
        stance: get("stance") || undefined,
        width: get("width") || undefined,
        colors: get("colors") || undefined,
        usages: get("usages") || undefined,
        seasons: get("seasons") || undefined,
        price: toNum(get("price")),
        salePrice: get("salePrice") ? toNum(get("salePrice")) : undefined,
        stock: toNum(get("stock")),
        minOrder: get("minOrder") ? toNum(get("minOrder")) : undefined,
        unit: /عدد|piece|pcs/i.test(unitRaw) ? "عدد" : "متر",
        description: get("description") || undefined,
        image: get("image") || undefined,
      };
      const problems: string[] = [];
      if (!row.code) problems.push("کد خالی");
      if (!row.name) problems.push("نام خالی");
      if (!row.material) problems.push("جنس خالی");
      else if (!materials.includes(row.material)) problems.push(`جنس جدید «${row.material}»`);
      if (!Number.isFinite(row.price) || row.price <= 0 || !/\d/.test(get("price"))) problems.push("قیمت نامعتبر");
      if (!Number.isFinite(row.stock) || !/\d/.test(get("stock"))) problems.push("موجودی نامعتبر");
      if (row.salePrice !== undefined && row.salePrice >= row.price && row.salePrice > 0) problems.push("قیمت ویژه بزرگ‌تر از قیمت");
      return { row, problems, isNew: !existingCodes.includes(row.code) };
    });
  }, [body, mapping, step, existingCodes, materials]);

  const blocking = rows.filter((r) => r.problems.some((p) => !p.startsWith("جنس جدید")));
  const dupes = rows.map((r) => r.row.code).filter((c, i, a) => c && a.indexOf(c) !== i);

  const run = () =>
    start(async () => {
      try {
        const r = await importProductsAction(rows.filter((x) => !x.problems.some((p) => !p.startsWith("جنس جدید"))).map((x) => x.row));
        setResult(r);
        setStep(4);
        toast(`${faNum(r.created)} جدید · ${faNum(r.updated)} به‌روزرسانی`);
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "درون‌ریزی انجام نشد");
      }
    });

  const stepPill = (n: number, label: string) => (
    <span className={`flex items-center gap-1.5 text-xs ${step === n ? "font-bold text-modi-purple-800" : step > n ? "text-modi-success" : "text-modi-gray-900"}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === n ? "bg-modi-purple-800 text-white" : step > n ? "bg-modi-success-bg" : "bg-modi-gray-500"}`}>{faNum(n)}</span>
      {label}
    </span>
  );

  return (
    <div>
      <PageHeader
        title="درون‌ریزی محصولات"
        subtitle="CSV از اکسل یا گوگل‌شیت — کدهای موجود به‌روزرسانی و کدهای جدید ساخته می‌شوند"
        back={{ href: "/admin/products", label: "محصولات" }}
        actions={<a href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`} download="modilish-import-template.csv" className={`${btnSoft} h-9 text-xs`}>دانلود قالب CSV</a>}
      />
      <div className="mb-4 flex flex-wrap gap-4 rounded-2xl bg-white px-4 py-3">
        {stepPill(1, "فایل")}{stepPill(2, "تطبیق ستون‌ها")}{stepPill(3, "پیش‌نمایش")}{stepPill(4, "نتیجه")}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <Card title="انتخاب فایل">
            <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setFileName(f.name); f.text().then(load); }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e4dfec] bg-modi-gray-300 px-4 py-10 text-sm hover:border-modi-purple-500">
              <span className="font-bold">انتخاب فایل CSV</span>
              <span className="mt-1 text-[11px] text-modi-gray-900">{fileName || "جداکننده ویرگول، سمی‌کالن یا تب — UTF-8"}</span>
            </button>
            <p className="mt-3 text-[11px] leading-5 text-modi-gray-900">ستون‌های لازم: کد، نام، جنس، قیمت، موجودی. بقیه اختیاری‌اند؛ چند مقدار را با «،» جدا کنید. برای ویرایش انبوه، ابتدا از <Link href="/api/admin/export?type=products" className="font-bold text-modi-purple-800">برون‌ریزی</Link> شروع کنید.</p>
          </Card>
          <Card title="یا متن را بچسبانید">
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"code,name,material,price,stock\n1101,کرپ حریر نقره‌ای,کرپ,185000,24"} dir="ltr" className={`${textareaCls} min-h-40 text-left font-mono text-xs`} />
            <button type="button" disabled={!raw.trim()} onClick={() => load(raw)} className={`${btnPrimary} mt-2 h-9 text-xs`}>ادامه</button>
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card title={`تطبیق ستون‌ها · ${faNum(body.length)} ردیف`}>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} required={f.required}>
                <select value={mapping[f.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value === "" ? undefined : Number(e.target.value) })} className={`${inputCls} h-9`}>
                  <option value="">— نادیده بگیر —</option>
                  {header.map((h, i) => <option key={i} value={i}>{h || `ستون ${faNum(i + 1)}`}{body[0]?.[i] ? ` (مثلاً ${body[0][i].slice(0, 20)})` : ""}</option>)}
                </select>
              </Field>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={fields.some((f) => f.required && mapping[f.key] === undefined)} onClick={() => setStep(3)} className={btnPrimary}>پیش‌نمایش</button>
            <button type="button" onClick={() => setStep(1)} className={btnSoft}>بازگشت</button>
          </div>
          {fields.some((f) => f.required && mapping[f.key] === undefined) && <p className="mt-2 text-[11px] text-modi-danger">ستون‌های ستاره‌دار باید تطبیق داده شوند.</p>}
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 text-xs">
            <span><b className="tabular-nums">{faNum(rows.filter((r) => r.isNew).length)}</b> جدید</span>
            <span><b className="tabular-nums">{faNum(rows.filter((r) => !r.isNew).length)}</b> به‌روزرسانی</span>
            {blocking.length > 0 && <span className="text-modi-danger"><b className="tabular-nums">{faNum(blocking.length)}</b> ردیف با خطا (رد می‌شوند)</span>}
            {dupes.length > 0 && <span className="text-modi-warning">کد تکراری: {[...new Set(dupes)].join("، ")} — آخرین ردیف برنده است</span>}
            <span className="ms-auto flex gap-2">
              <button type="button" onClick={() => setStep(2)} className={`${btnSoft} h-9 text-xs`}>بازگشت</button>
              <button type="button" disabled={pending || rows.length - blocking.length === 0} onClick={run} className={`${btnPrimary} h-9 text-xs`}>{pending ? "در حال درون‌ریزی…" : `درون‌ریزی ${faNum(rows.length - blocking.length)} ردیف`}</button>
            </span>
          </div>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
            <table className="w-full min-w-[820px] text-xs">
              <thead>
                <tr className="border-b border-[#ede9f2] text-[11px] font-bold text-modi-gray-900">
                  <th className="px-3 py-2 text-start">#</th><th className="px-3 py-2 text-start">کد</th><th className="px-3 py-2 text-start">نام</th><th className="px-3 py-2 text-start">جنس</th><th className="px-3 py-2 text-start">قیمت</th><th className="px-3 py-2 text-start">ویژه</th><th className="px-3 py-2 text-start">موجودی</th><th className="px-3 py-2 text-start">واحد</th><th className="px-3 py-2 text-start">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const bad = r.problems.some((p) => !p.startsWith("جنس جدید"));
                  return (
                    <tr key={i} className={`border-b border-[#f3f0f7] last:border-b-0 ${bad ? "bg-modi-danger-bg/40" : ""}`}>
                      <td className="px-3 py-2 tabular-nums text-modi-gray-900">{faNum(i + 1)}</td>
                      <td className="px-3 py-2 font-mono" dir="ltr">{r.row.code}</td>
                      <td className="px-3 py-2">{r.row.name}</td>
                      <td className="px-3 py-2">{r.row.material}</td>
                      <td className="px-3 py-2 tabular-nums">{faNum(r.row.price)}</td>
                      <td className="px-3 py-2 tabular-nums">{r.row.salePrice ? faNum(r.row.salePrice) : "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{faNum(r.row.stock)}</td>
                      <td className="px-3 py-2">{r.row.unit}</td>
                      <td className="px-3 py-2">
                        {r.problems.length === 0 ? (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.isNew ? "bg-modi-success-bg text-modi-success" : "bg-modi-info-bg text-modi-info"}`}>{r.isNew ? "جدید" : "به‌روزرسانی"}</span>
                        ) : (
                          <span className={`text-[10px] font-bold ${bad ? "text-modi-danger" : "text-modi-warning"}`}>{r.problems.join(" · ")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 4 && result && (
        <Card title="نتیجه درون‌ریزی">
          <p className="text-sm"><b className="tabular-nums">{faNum(result.created)}</b> محصول جدید ساخته شد · <b className="tabular-nums">{faNum(result.updated)}</b> محصول به‌روزرسانی شد{result.errors.length > 0 && <> · <span className="text-modi-danger"><b className="tabular-nums">{faNum(result.errors.length)}</b> خطا</span></>}</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-modi-danger">
              {result.errors.map((e, i) => <li key={i}><span className="font-mono" dir="ltr">{e.code}</span>: {e.message}</li>)}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-modi-gray-900">محصولات جدید با وضعیت منتشرشده و تصویر پیش‌فرض ساخته می‌شوند؛ عکس‌ها را در صفحه هر محصول یا از رسانه اضافه کنید.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/admin/products" className={btnPrimary}>رفتن به محصولات</Link>
            <Link href="/admin/products?filter=nophoto" className={btnSoft}>بدون عکس‌ها</Link>
            <button type="button" onClick={() => { setStep(1); setTable([]); setRaw(""); setFileName(""); setResult(null); }} className={btnSoft}>فایل دیگر</button>
          </div>
        </Card>
      )}
    </div>
  );
}
