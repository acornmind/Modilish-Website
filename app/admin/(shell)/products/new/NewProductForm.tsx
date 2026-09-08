"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { categories } from "@/lib/products";
import { createProductAction } from "@/lib/productActions";
import { toast } from "@/lib/toast";

const materialOptions = categories.filter((c) => c !== "همه");

export default function NewProductForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [unit, setUnit] = useState<"متر" | "عدد">("متر");
  const [category, setCategory] = useState(materialOptions[0]);
  const [price, setPrice] = useState("");
  const [meters, setMeters] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = Number(price);
    const stockNum = Number(meters);
    if (!name.trim()) return setError("نام محصول را وارد کنید.");
    if (!slug.trim()) return setError("کد محصول (SKU) را وارد کنید.");
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setError("قیمت معتبر نیست.");
    if (!Number.isFinite(stockNum) || stockNum < 0) return setError("موجودی معتبر نیست.");

    startTransition(async () => {
      try {
        const { slug: createdSlug } = await createProductAction({
          name: name.trim(),
          slug: slug.trim(),
          unit,
          category,
          price: priceNum,
          meters: stockNum,
        });
        toast("پارچه اضافه شد — حالا عکس و مشخصات را کامل کنید");
        router.push(`/admin/products/${createdSlug}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "ذخیره نشد — دوباره تلاش کنید.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:p-6"
    >
      <div>
        <p className="mb-2 text-sm font-bold">این محصول چطور فروخته می‌شود؟</p>
        <div className="flex gap-2">
          {(["متر", "عدد"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`h-10 flex-1 rounded-xl text-sm font-bold ${
                unit === u ? "bg-modi-purple-800 text-white" : "bg-modi-gray-500 text-[#2b2740]"
              }`}
            >
              {u === "متر" ? "متری" : "عددی"}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-bold require">نام محصول</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 w-full rounded-xl bg-modi-gray-500 px-3 outline-none"
          placeholder="مثلاً کرپ حریر آبی آسمانی"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-bold require">کد محصول (SKU)</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.trim())}
          className="h-11 w-full rounded-xl bg-modi-gray-500 px-3 tabular-nums outline-none"
          placeholder="مثلاً 2001"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-bold">خانواده جنس</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 w-full rounded-xl bg-modi-gray-500 px-3 outline-none"
        >
          {materialOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-bold require">قیمت (تومان)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            className="h-11 w-full rounded-xl bg-modi-gray-500 px-3 tabular-nums outline-none"
            placeholder="۵۴۸۰۰۰"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold require">موجودی ({unit})</span>
          <input
            value={meters}
            onChange={(e) => setMeters(e.target.value)}
            inputMode="decimal"
            className="h-11 w-full rounded-xl bg-modi-gray-500 px-3 tabular-nums outline-none"
            placeholder="۱۰"
          />
        </label>
      </div>

      {error && <p className="text-xs font-bold text-modi-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-modi-purple-800 text-sm font-bold text-white hover:bg-modi-purple-500 disabled:opacity-60"
      >
        {pending ? "در حال ذخیره…" : "ذخیره و انتشار"}
      </button>
    </form>
  );
}
