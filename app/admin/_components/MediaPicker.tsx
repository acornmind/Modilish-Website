"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { listMediaAction, uploadMediaAction } from "@/lib/productActions";
import type { MediaItem } from "@/lib/productStore";
import { toast } from "@/lib/toast";
import { btnPrimary, btnSoft, inputCls } from "./ui";

/** "Upload from anywhere in the admin opens the same picker" — §4.13. */
export default function MediaPicker({
  value,
  onChange,
  label = "تصویر",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || items) return;
    listMediaAction().then(setItems).catch(() => setItems([]));
  }, [open, items]);

  const upload = (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      try {
        const { url } = await uploadMediaAction(fd);
        onChange(url);
        setItems(null);
        setOpen(false);
        toast("تصویر بارگذاری شد");
      } catch (e) {
        toast(e instanceof Error ? e.message : "بارگذاری نشد");
      }
    });
  };

  const filtered = (items ?? []).filter((m) => !q || m.name.includes(q) || m.url.includes(q));

  return (
    <div>
      <span className="mb-1 block text-xs font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#ede9f2] bg-modi-gray-300">
          {value && <Image src={value} alt="" fill sizes="80px" className="object-cover" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" placeholder="/img/products/1001.jpg" className={`${inputCls} text-left text-xs`} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(true)} className={`${btnSoft} h-9 text-xs`}>
              انتخاب از رسانه
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className={`${btnSoft} h-9 text-xs`}>
              {pending ? "در حال بارگذاری…" : "بارگذاری فایل"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-t-3xl bg-white p-4 lg:rounded-2xl">
            <div className="mb-3 flex items-center gap-2">
              <p className="text-sm font-bold">کتابخانه رسانه</p>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…" className={`${inputCls} h-9 max-w-xs`} />
              <button type="button" onClick={() => fileRef.current?.click()} className={`${btnPrimary} ms-auto h-9 text-xs`}>
                بارگذاری
              </button>
              <button type="button" aria-label="بستن" onClick={() => setOpen(false)} className="h-9 w-9 rounded-full bg-modi-gray-500">×</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {items === null ? (
                <p className="py-10 text-center text-xs text-modi-gray-900">در حال بارگذاری…</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
                  {filtered.slice(0, 400).map((m) => (
                    <button
                      key={m.url}
                      type="button"
                      title={m.name}
                      onClick={() => {
                        onChange(m.url);
                        setOpen(false);
                      }}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 ${value === m.url ? "border-modi-purple-800" : "border-transparent"}`}
                    >
                      <Image src={m.url} alt={m.name} fill sizes="100px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
