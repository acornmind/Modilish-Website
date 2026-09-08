"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import type { MediaItem } from "@/lib/productStore";
import { deleteMediaAction, uploadMediaAction } from "@/lib/productActions";
import { faNum } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import { btnPrimary, btnSoft, ConfirmDialog, inputCls } from "./ui";

/** رسانه — docs/admin-spec.md §4.13. */
export default function MediaGrid({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<"all" | MediaItem["folder"] | "unused">("all");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [confirm, setConfirm] = useState<MediaItem | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(
    () => items.filter((m) => (folder === "all" || (folder === "unused" ? m.usedBy === 0 && m.folder !== "site" : m.folder === folder)) && (!q || m.name.includes(q))),
    [items, q, folder],
  );

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    start(async () => {
      let ok = 0;
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        try {
          await uploadMediaAction(fd);
          ok++;
        } catch (e) {
          toast(e instanceof Error ? e.message : "بارگذاری نشد");
        }
      }
      if (ok) toast(`${faNum(ok)} تصویر بارگذاری شد`);
      router.refresh();
    });
  };

  const kb = (b: number) => `${faNum(Math.round(b / 1024))} KB`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex-1">
          <h1 className="text-base font-bold lg:text-lg">رسانه</h1>
          <p className="mt-0.5 text-xs text-modi-gray-900">{faNum(items.length)} فایل · تصاویر محصولات، بارگذاری‌ها و تصاویر سایت</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…" className={`${inputCls} h-9 max-w-[200px]`} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className={btnPrimary}>{pending ? "در حال بارگذاری…" : "بارگذاری"}</button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {([["all", "همه"], ["uploads", "بارگذاری‌شده"], ["products", "محصولات"], ["site", "سایت"], ["unused", "استفاده‌نشده"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFolder(k)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ${folder === k ? "bg-modi-purple-800 text-white" : "bg-white"}`}>{l}</button>
        ))}
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
        className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] sm:grid-cols-4 lg:grid-cols-8"
      >
        {list.slice(0, 600).map((m) => (
          <button key={m.url} type="button" onClick={() => setSelected(m)} className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-modi-gray-300 ${selected?.url === m.url ? "border-modi-purple-800" : "border-transparent"}`} title={m.name}>
            <Image src={m.url} alt={m.name} fill sizes="120px" className="object-cover" />
            {m.usedBy > 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">{faNum(m.usedBy)}</span>}
          </button>
        ))}
        {list.length === 0 && <p className="col-span-full py-10 text-center text-xs text-modi-gray-900">فایلی نیست — فایل را این‌جا رها کنید یا «بارگذاری» بزنید.</p>}
      </div>
      {selected && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 px-3 lg:bottom-4 lg:right-[264px] lg:px-8">
          <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_8px_24px_-8px_rgba(43,39,64,0.5)]">
            <Image src={selected.url} alt="" width={56} height={56} className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1 text-xs">
              <p className="truncate font-bold" dir="ltr">{selected.url}</p>
              <p className="text-modi-gray-900">{kb(selected.bytes)} · {selected.usedBy > 0 ? `روی ${faNum(selected.usedBy)} محصول` : "استفاده‌نشده"}</p>
            </div>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(selected.url); toast("آدرس کپی شد"); }} className={`${btnSoft} h-9 text-xs`}>کپی آدرس</button>
            {selected.folder === "uploads" && selected.usedBy === 0 && (
              <button type="button" onClick={() => setConfirm(selected)} className="h-9 rounded-xl bg-modi-danger-bg px-3 text-xs font-bold text-modi-danger">حذف</button>
            )}
            <button type="button" aria-label="بستن" onClick={() => setSelected(null)} className="h-9 w-9 rounded-full bg-modi-gray-500">×</button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirm}
        title={`«${confirm?.name}» حذف شود؟`}
        text="فایل از سرور پاک می‌شود."
        confirmLabel="حذف"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => start(async () => { if (!confirm) return; try { await deleteMediaAction(confirm.url); toast("حذف شد"); setSelected(null); } catch (e) { toast(e instanceof Error ? e.message : "حذف نشد"); } setConfirm(null); router.refresh(); })}
      />
    </div>
  );
}
