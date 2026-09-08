"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  defaultSection,
  newSectionId,
  sectionTypeLabels,
  type CircleItem,
  type HeroSlide,
  type Layout,
  type LayoutRecord,
  type RowSource,
  type Section,
  type SectionType,
} from "@/lib/siteContent";
import { publishLayoutAction, restoreLayoutAction, saveLayoutDraftAction } from "@/lib/siteActions";
import { toast } from "@/lib/toast";
import { faNum } from "@/lib/adminFormat";
import { cacheBust } from "@/lib/uid";
import MediaPicker from "./MediaPicker";
import AdminIcon from "../icons";
import { btnGhost, btnPrimary, btnSoft, Card, ConfirmDialog, Field, inputCls, PageHeader, textareaCls, Toggle } from "./ui";

type Key = "home" | "offer";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

/** Home / offer page builder — docs/admin-spec.md §4.5, §4.6. Vertical section
 *  list with per-type editors, live storefront preview (the real page, draft
 *  mode), autosaved draft, explicit publish, history with restore. */
export default function LayoutBuilder({
  layoutKey,
  record,
  emptyIds,
  materials,
  patterns,
  usages,
}: {
  layoutKey: Key;
  record: LayoutRecord;
  emptyIds: string[];
  materials: string[];
  patterns: string[];
  usages: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Layout>(record.draft);
  const [savedJson, setSavedJson] = useState(JSON.stringify(record.draft));
  const [selected, setSelected] = useState<string | null>(record.draft.sections[0]?.id ?? null);
  const [addOpen, setAddOpen] = useState(false);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const autosave = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewPath = layoutKey === "home" ? "/?preview=draft" : "/offer?preview=draft";
  const dirty = JSON.stringify(draft) !== savedJson;
  const publishedDiffers = JSON.stringify(record.published) !== savedJson;

  function reloadPreview() {
    const f = frameRef.current;
    if (f) f.src = previewPath + "&t=" + cacheBust();
  }

  function persist(next: Layout, silent = false) {
    startSaving(async () => {
      try {
        await saveLayoutDraftAction(layoutKey, next);
        setSavedJson(JSON.stringify(next));
        if (!silent) toast("پیش‌نویس ذخیره شد");
        reloadPreview();
        router.refresh();
      } catch {
        toast("ذخیره نشد — دوباره تلاش کنید");
      }
    });
  }

  /** "Drafts autosave" — §1.2 */
  function update(next: Layout) {
    setDraft(next);
    if (autosave.current) clearTimeout(autosave.current);
    autosave.current = setTimeout(() => persist(next, true), 1200);
  }

  const patchSection = (id: string, patch: Partial<Section>) =>
    update({ sections: draft.sections.map((s) => (s.id === id ? ({ ...s, ...patch } as Section) : s)) });
  const patchProps = <T extends Section>(s: T, props: Partial<T["props"]>) =>
    patchSection(s.id, { props: { ...s.props, ...props } } as Partial<Section>);

  const move = (id: string, d: -1 | 1) => {
    const i = draft.sections.findIndex((s) => s.id === id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= draft.sections.length) return;
    const next = [...draft.sections];
    [next[i], next[j]] = [next[j], next[i]];
    update({ sections: next });
  };
  const moveTo = (id: string, where: "top" | "bottom") => {
    const s = draft.sections.find((x) => x.id === id);
    if (!s) return;
    const rest = draft.sections.filter((x) => x.id !== id);
    update({ sections: where === "top" ? [s, ...rest] : [...rest, s] });
  };
  const duplicate = (id: string) => {
    const i = draft.sections.findIndex((s) => s.id === id);
    if (i < 0) return;
    const copy = JSON.parse(JSON.stringify(draft.sections[i])) as Section;
    copy.id = newSectionId();
    const next = [...draft.sections];
    next.splice(i + 1, 0, copy);
    update({ sections: next });
    setSelected(copy.id);
  };
  const remove = (id: string) => {
    const removed = draft.sections.find((s) => s.id === id);
    const idx = draft.sections.findIndex((s) => s.id === id);
    update({ sections: draft.sections.filter((s) => s.id !== id) });
    if (selected === id) setSelected(null);
    // 10-second undo (§1.2)
    if (removed) {
      toast(`«${sectionTypeLabels[removed.type]}» حذف شد`, { label: "بازگردانی", href: "#undo" });
      const undo = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest('a[href="#undo"]');
        if (!a) return;
        e.preventDefault();
        setDraft((d) => {
          const next = [...d.sections];
          next.splice(Math.min(idx, next.length), 0, removed);
          const layout = { sections: next };
          persist(layout, true);
          return layout;
        });
        document.removeEventListener("click", undo, true);
      };
      document.addEventListener("click", undo, true);
      setTimeout(() => document.removeEventListener("click", undo, true), 10000);
    }
  };
  const add = (type: SectionType) => {
    const s = defaultSection(type);
    update({ sections: [...draft.sections, s] });
    setSelected(s.id);
    setAddOpen(false);
  };

  const sel = draft.sections.find((s) => s.id === selected) ?? null;

  return (
    <div>
      <PageHeader
        title={layoutKey === "home" ? "صفحه اصلی" : "فروش فوق‌العاده"}
        subtitle={
          record.publishedAt
            ? `آخرین انتشار: ${fmtDate(record.publishedAt)}${publishedDiffers ? " · پیش‌نویس با نسخه منتشرشده فرق دارد" : ""}`
            : "هنوز از این سازنده منتشر نشده — نسخه پیش‌فرض روی سایت است"
        }
        actions={
          <>
            <button type="button" onClick={() => setHistoryOpen(true)} className={btnSoft}>
              تاریخچه {record.history.length > 0 && `(${faNum(record.history.length)})`}
            </button>
            <Link href={previewPath} target="_blank" className={btnSoft}>
              <AdminIcon name="external" size={14} /> پیش‌نمایش
            </Link>
            <button type="button" onClick={() => persist(draft)} disabled={saving || !dirty} className={btnSoft}>
              {saving ? "…" : "ذخیره پیش‌نویس"}
            </button>
            <button type="button" onClick={() => setConfirmPublish(true)} disabled={saving} className={btnPrimary}>
              انتشار
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* builder column */}
        <div className="space-y-3">
          {draft.sections.map((s, i) => {
            const empty = emptyIds.includes(s.id);
            const active = selected === s.id;
            return (
              <div key={s.id} className={`rounded-2xl bg-white shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] ${active ? "ring-2 ring-modi-purple-800" : ""} ${s.visible ? "" : "opacity-60"}`}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="flex flex-col">
                    <button type="button" aria-label="بالا" onClick={() => move(s.id, -1)} disabled={i === 0} className="h-4 w-6 text-[10px] text-modi-gray-900 disabled:opacity-30">▲</button>
                    <button type="button" aria-label="پایین" onClick={() => move(s.id, 1)} disabled={i === draft.sections.length - 1} className="h-4 w-6 text-[10px] text-modi-gray-900 disabled:opacity-30">▼</button>
                  </div>
                  <button type="button" onClick={() => setSelected(active ? null : s.id)} className="min-w-0 flex-1 text-start">
                    <span className="block text-sm font-bold">{sectionTypeLabels[s.type]}</span>
                    <span className="block truncate text-[11px] text-modi-gray-900">{summary(s)}</span>
                  </button>
                  {empty && <span className="shrink-0 rounded-full bg-modi-warning-bg px-2 py-0.5 text-[10px] font-bold text-modi-warning">فعلاً محتوایی ندارد</span>}
                  {s.device !== "all" && <span className="shrink-0 rounded-full bg-modi-gray-500 px-2 py-0.5 text-[10px] text-modi-gray-900">{s.device === "mobile" ? "فقط موبایل" : "فقط دسکتاپ"}</span>}
                  <button type="button" aria-label={s.visible ? "پنهان کردن" : "نمایش"} title={s.visible ? "نمایان" : "پنهان"} onClick={() => patchSection(s.id, { visible: !s.visible })} className={`h-8 w-8 rounded-lg text-xs ${s.visible ? "text-modi-purple-800" : "text-modi-gray-900"} hover:bg-modi-gray-500`}>
                    {s.visible ? "👁" : "🚫"}
                  </button>
                  <SectionMenu onDuplicate={() => duplicate(s.id)} onTop={() => moveTo(s.id, "top")} onBottom={() => moveTo(s.id, "bottom")} onDelete={() => remove(s.id)} />
                </div>
                {active && (
                  <div className="border-t border-[#f3f0f7] bg-modi-purple-200/40 p-3">
                    <SectionEditor section={s} onChange={(props) => patchProps(s, props)} onBase={(patch) => patchSection(s.id, patch)} materials={materials} patterns={patterns} usages={usages} />
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={() => setAddOpen(true)} className="w-full rounded-2xl border-2 border-dashed border-modi-purple-500 py-3 text-sm font-bold text-modi-purple-800 hover:bg-modi-purple-200">
            + افزودن بخش
          </button>
        </div>

        {/* preview column */}
        <div className="lg:sticky lg:top-24">
          <Card
            title="پیش‌نمایش زنده (پیش‌نویس)"
            action={
              <div className="flex rounded-xl bg-modi-gray-300 p-0.5">
                {(["mobile", "desktop"] as const).map((d) => (
                  <button key={d} type="button" onClick={() => setDevice(d)} className={`h-8 rounded-lg px-3 text-xs font-bold ${device === d ? "bg-modi-purple-800 text-white" : "text-modi-gray-900"}`}>
                    {d === "mobile" ? "موبایل" : "دسکتاپ"}
                  </button>
                ))}
              </div>
            }
          >
            <div className={`mx-auto overflow-hidden rounded-2xl border-[6px] border-modi-gray-500 bg-white ${device === "mobile" ? "w-[min(100%,412px)]" : "w-full"}`}>
              <iframe
                ref={frameRef}
                title="پیش‌نمایش"
                src={previewPath}
                className={`block w-full ${device === "mobile" ? "h-[640px]" : "h-[560px]"}`}
                style={device === "desktop" ? { width: "1280px", transform: "scale(0.5)", transformOrigin: "top right", height: "1120px", marginBottom: "-560px" } : undefined}
              />
            </div>
            <p className="mt-2 text-[11px] text-modi-gray-900">پیش‌نمایش پس از هر ذخیره خودکار تازه می‌شود.</p>
          </Card>
        </div>
      </div>

      {/* add-section sheet */}
      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-4 lg:rounded-2xl">
            <p className="mb-3 text-sm font-bold">افزودن بخش</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {(Object.keys(sectionTypeLabels) as SectionType[]).map((t) => (
                <button key={t} type="button" onClick={() => add(t)} className="rounded-xl bg-modi-gray-300 px-3 py-3 text-start text-sm font-bold hover:bg-modi-purple-200">
                  {sectionTypeLabels[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* history sheet */}
      {historyOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-4 lg:rounded-2xl">
            <p className="mb-3 text-sm font-bold">تاریخچه انتشار</p>
            {record.history.length === 0 ? (
              <p className="py-6 text-center text-xs text-modi-gray-900">هنوز نسخه قبلی ثبت نشده — با اولین انتشار، نسخه فعلی اینجا نگه داشته می‌شود.</p>
            ) : (
              <ul className="divide-y divide-[#f3f0f7]">
                {record.history.map((h, i) => (
                  <li key={h.at} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      <span className="block font-bold">{h.label}</span>
                      <span className="block text-[11px] text-modi-gray-900">{fmtDate(h.at)} · {faNum(h.snapshot.sections.length)} بخش</span>
                    </span>
                    <button
                      type="button"
                      className={`${btnSoft} h-8 text-xs`}
                      onClick={() =>
                        startSaving(async () => {
                          await restoreLayoutAction(layoutKey, i);
                          setDraft(h.snapshot);
                          setSavedJson(JSON.stringify(h.snapshot));
                          setHistoryOpen(false);
                          toast("به پیش‌نویس بازگردانده شد — برای اعمال روی سایت، انتشار کنید");
                          reloadPreview();
                          router.refresh();
                        })
                      }
                    >
                      بازگردانی
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmPublish}
        title="این نسخه روی سایت منتشر شود؟"
        text={`${faNum(draft.sections.filter((s) => s.visible).length)} بخش نمایان. نسخه فعلی سایت در تاریخچه نگه داشته می‌شود و می‌توانید برگردید.`}
        confirmLabel="انتشار"
        onCancel={() => setConfirmPublish(false)}
        onConfirm={() =>
          startSaving(async () => {
            setConfirmPublish(false);
            await saveLayoutDraftAction(layoutKey, draft);
            await publishLayoutAction(layoutKey);
            setSavedJson(JSON.stringify(draft));
            toast("منتشر شد — تغییرات روی سایت اعمال شد", { label: "مشاهده سایت", href: layoutKey === "home" ? "/" : "/offer" });
            router.refresh();
          })
        }
      />
    </div>
  );
}

function summary(s: Section): string {
  switch (s.type) {
    case "hero":
      return `${faNum(s.props.slides.length)} اسلاید`;
    case "circles":
      return s.props.items.map((i) => i.label).join(" · ");
    case "productRow":
      return `${s.props.title} · ${sourceLabel(s.props.source)} · ${faNum(s.props.limit)} محصول`;
    case "infoCard":
      return s.props.title;
    case "banner":
      return s.props.href || "بدون لینک";
    case "magazine":
      return `${s.props.title} · آخرین ${faNum(s.props.limit)} مطلب`;
    case "brand":
      return s.props.title;
    case "countdown":
      return s.props.title;
    case "richText":
      return s.props.title || s.props.text.slice(0, 60) || "خالی";
  }
}

function sourceLabel(src: RowSource) {
  switch (src.kind) {
    case "material":
      return `جنس: ${src.value}`;
    case "pattern":
      return `طرح: ${src.value}`;
    case "usage":
      return `کاربرد: ${src.value}`;
    case "query":
      return `جستجو: ${src.value}`;
    case "newest":
      return "جدیدترین";
    case "onSale":
      return "تخفیف‌دار";
    case "manual":
      return `انتخاب دستی (${faNum(src.skus.length)})`;
  }
}

function SectionMenu({ onDuplicate, onTop, onBottom, onDelete }: { onDuplicate: () => void; onTop: () => void; onBottom: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" aria-label="گزینه‌ها" onClick={() => setOpen((v) => !v)} className="h-8 w-8 rounded-lg text-modi-gray-900 hover:bg-modi-gray-500">⋯</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-20 w-40 rounded-xl bg-white p-1 text-xs shadow-[0_8px_24px_-8px_rgba(43,39,64,0.4)]">
            {[
              ["کپی", onDuplicate],
              ["انتقال به بالا", onTop],
              ["انتقال به پایین", onBottom],
            ].map(([label, fn]) => (
              <button key={label as string} type="button" onClick={() => { (fn as () => void)(); setOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-start hover:bg-modi-purple-200">
                {label as string}
              </button>
            ))}
            <button type="button" onClick={() => { onDelete(); setOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-start text-modi-danger hover:bg-modi-danger-bg">
              حذف
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- per-type editors ---------------- */

function SectionEditor({
  section: s,
  onChange,
  onBase,
  materials,
  patterns,
  usages,
}: {
  section: Section;
  onChange: (props: Partial<Section["props"]>) => void;
  onBase: (patch: Partial<Section>) => void;
  materials: string[];
  patterns: string[];
  usages: string[];
}) {
  const common = (
    <Field label="نمایش در" className="mt-3">
      <div className="flex gap-1">
        {(["all", "mobile", "desktop"] as const).map((d) => (
          <button key={d} type="button" onClick={() => onBase({ device: d })} className={`h-8 flex-1 rounded-lg text-xs font-bold ${s.device === d ? "bg-modi-purple-800 text-white" : "bg-white"}`}>
            {d === "all" ? "همه" : d === "mobile" ? "فقط موبایل" : "فقط دسکتاپ"}
          </button>
        ))}
      </div>
    </Field>
  );

  switch (s.type) {
    case "hero":
      return (
        <div>
          <SlidesEditor slides={s.props.slides} onChange={(slides) => onChange({ slides })} />
          <Field label="فاصله تعویض خودکار (ثانیه)" className="mt-3">
            <input type="number" min={2} value={s.props.intervalMs / 1000} onChange={(e) => onChange({ intervalMs: Math.max(2, Number(e.target.value) || 5) * 1000 })} className={`${inputCls} w-28`} />
          </Field>
          {common}
        </div>
      );
    case "circles":
      return (
        <div>
          <CirclesEditor items={s.props.items} onChange={(items) => onChange({ items })} materials={materials} patterns={patterns} />
          {common}
        </div>
      );
    case "productRow":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Field label="عنوان">
              <input value={s.props.title} onChange={(e) => onChange({ title: e.target.value })} className={inputCls} />
            </Field>
            <Field label="لینک «مشاهده همه»" hint="خالی = بدون لینک">
              <input value={s.props.href} onChange={(e) => onChange({ href: e.target.value })} dir="ltr" className={`${inputCls} text-left`} />
            </Field>
          </div>
          <RowSourceEditor source={s.props.source} onChange={(source) => onChange({ source })} materials={materials} patterns={patterns} usages={usages} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="تعداد (۶ تا ۲۰)">
              <input type="number" min={6} max={20} value={s.props.limit} onChange={(e) => onChange({ limit: Math.min(20, Math.max(6, Number(e.target.value) || 10)) })} className={inputCls} />
            </Field>
            <div className="pt-5">
              <Toggle checked={s.props.hideOutOfStock} onChange={(v) => onChange({ hideOutOfStock: v })} label="پنهان‌کردن ناموجود" />
            </div>
          </div>
          {common}
        </div>
      );
    case "infoCard":
      return (
        <div className="space-y-3">
          <Field label="عنوان">
            <input value={s.props.title} onChange={(e) => onChange({ title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="متن">
            <input value={s.props.text} onChange={(e) => onChange({ text: e.target.value })} className={inputCls} />
          </Field>
          <Field label="لینک (اختیاری)">
            <input value={s.props.href} onChange={(e) => onChange({ href: e.target.value })} dir="ltr" className={`${inputCls} text-left`} />
          </Field>
          {common}
        </div>
      );
    case "banner":
      return (
        <div className="space-y-3">
          <MediaPicker value={s.props.img} onChange={(img) => onChange({ img })} label="تصویر بنر" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="لینک">
              <input value={s.props.href} onChange={(e) => onChange({ href: e.target.value })} dir="ltr" className={`${inputCls} text-left`} />
            </Field>
            <Field label="متن جایگزین">
              <input value={s.props.alt} onChange={(e) => onChange({ alt: e.target.value })} className={inputCls} />
            </Field>
          </div>
          {common}
        </div>
      );
    case "magazine":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Field label="عنوان" className="lg:col-span-2">
              <input value={s.props.title} onChange={(e) => onChange({ title: e.target.value })} className={inputCls} />
            </Field>
            <Field label="متن لینک">
              <input value={s.props.linkText} onChange={(e) => onChange({ linkText: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="آخرین n مطلب">
            <input type="number" min={1} max={6} value={s.props.limit} onChange={(e) => onChange({ limit: Math.min(6, Math.max(1, Number(e.target.value) || 1)) })} className={`${inputCls} w-28`} />
          </Field>
          {common}
        </div>
      );
    case "brand":
      return (
        <div className="space-y-3">
          <Field label="عنوان">
            <input value={s.props.title} onChange={(e) => onChange({ title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="متن">
            <textarea value={s.props.text} onChange={(e) => onChange({ text: e.target.value })} className={textareaCls} />
          </Field>
          <MediaPicker value={s.props.image} onChange={(image) => onChange({ image })} />
          <Field label="لینک">
            <input value={s.props.href} onChange={(e) => onChange({ href: e.target.value })} dir="ltr" className={`${inputCls} text-left`} />
          </Field>
          {common}
        </div>
      );
    case "countdown":
      return (
        <div className="space-y-3">
          <Field label="عنوان">
            <input value={s.props.title} onChange={(e) => onChange({ title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="متن زیر عنوان">
            <input value={s.props.text} onChange={(e) => onChange({ text: e.target.value })} className={inputCls} />
          </Field>
          <Field label="هفتگی — تا پایان روز" hint="شمارش معکوس تا ۲۳:۵۹ روز انتخاب‌شده، هر هفته تکرار می‌شود.">
            <select value={s.props.weekday} onChange={(e) => onChange({ weekday: Number(e.target.value) })} className={inputCls}>
              {["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"].map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </Field>
          {common}
        </div>
      );
    case "richText":
      return (
        <div className="space-y-3">
          <Field label="عنوان (اختیاری)">
            <input value={s.props.title} onChange={(e) => onChange({ title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="متن" hint="پاراگراف‌ها را با یک خط خالی جدا کنید">
            <textarea value={s.props.text} onChange={(e) => onChange({ text: e.target.value })} className={textareaCls} />
          </Field>
          {common}
        </div>
      );
  }
}

function SlidesEditor({ slides, onChange }: { slides: HeroSlide[]; onChange: (s: HeroSlide[]) => void }) {
  const set = (i: number, patch: Partial<HeroSlide>) => onChange(slides.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {slides.map((sl, i) => (
        <div key={i} className="rounded-xl bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold">اسلاید {faNum(i + 1)}</span>
            <span className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} className={btnGhost}>▲</button>
              <button type="button" onClick={() => move(i, 1)} className={btnGhost}>▼</button>
              <button type="button" onClick={() => onChange(slides.filter((_, j) => j !== i))} className={`${btnGhost} text-modi-danger`}>حذف</button>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <Field label="عنوان"><input value={sl.title} onChange={(e) => set(i, { title: e.target.value })} className={inputCls} /></Field>
            <Field label="زیرعنوان"><input value={sl.sub} onChange={(e) => set(i, { sub: e.target.value })} className={inputCls} /></Field>
            <Field label="متن دکمه"><input value={sl.cta} onChange={(e) => set(i, { cta: e.target.value })} className={inputCls} /></Field>
            <Field label="لینک"><input value={sl.href} onChange={(e) => set(i, { href: e.target.value })} dir="ltr" className={`${inputCls} text-left`} /></Field>
          </div>
          <div className="mt-2">
            <MediaPicker value={sl.img} onChange={(img) => set(i, { img })} label="تصویر (۱۹۲۰×۶۰۰ دسکتاپ / ۸۰۰×۴۵۰ موبایل)" />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...slides, { title: "", sub: "", cta: "مشاهده", href: "/shop", img: "/img/products/1005.jpg" }])} className={btnGhost}>
        + افزودن اسلاید
      </button>
    </div>
  );
}

function CirclesEditor({ items, onChange, materials, patterns }: { items: CircleItem[]; onChange: (i: CircleItem[]) => void; materials: string[]; patterns: string[] }) {
  const set = (i: number, patch: Partial<CircleItem>) => onChange(items.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5 rounded-xl bg-white p-2">
          <input value={c.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="عنوان" className={`${inputCls} h-9`} />
          <select value={c.kind} onChange={(e) => set(i, { kind: e.target.value as CircleItem["kind"] })} className={`${inputCls} h-9 w-auto`}>
            <option value="family">جنس</option>
            <option value="pattern">طرح</option>
            <option value="query">جستجو</option>
            <option value="url">لینک</option>
          </select>
          {c.kind === "family" ? (
            <select value={c.value} onChange={(e) => set(i, { value: e.target.value })} className={`${inputCls} h-9`}>
              {materials.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : c.kind === "pattern" ? (
            <select value={c.value} onChange={(e) => set(i, { value: e.target.value })} className={`${inputCls} h-9`}>
              {patterns.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input value={c.value} onChange={(e) => set(i, { value: e.target.value })} placeholder={c.kind === "url" ? "/shop?…" : "کلیدواژه"} dir={c.kind === "url" ? "ltr" : undefined} className={`${inputCls} h-9`} />
          )}
          <span className="flex gap-0.5">
            <button type="button" onClick={() => move(i, -1)} className="h-9 w-7 rounded-lg bg-modi-gray-300 text-[10px]">▲</button>
            <button type="button" onClick={() => move(i, 1)} className="h-9 w-7 rounded-lg bg-modi-gray-300 text-[10px]">▼</button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="h-9 w-7 rounded-lg bg-modi-danger-bg text-modi-danger">×</button>
          </span>
          <div className="col-span-4">
            <MediaPicker value={c.img ?? ""} onChange={(img) => set(i, { img })} label="تصویر (خالی = عکس اولین محصول)" />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { label: "", kind: "family", value: materials[0] ?? "" }])} className={btnGhost}>
        + افزودن دایره
      </button>
    </div>
  );
}

function RowSourceEditor({ source, onChange, materials, patterns, usages }: { source: RowSource; onChange: (s: RowSource) => void; materials: string[]; patterns: string[]; usages: string[] }) {
  const kinds: { key: RowSource["kind"]; label: string }[] = [
    { key: "manual", label: "انتخاب دستی" },
    { key: "material", label: "بر اساس جنس" },
    { key: "pattern", label: "طرح" },
    { key: "usage", label: "کاربرد" },
    { key: "query", label: "جستجو" },
    { key: "newest", label: "جدیدترین" },
    { key: "onSale", label: "تخفیف‌دار" },
  ];
  const setKind = (kind: RowSource["kind"]) => {
    if (kind === "manual") onChange({ kind, skus: [] });
    else if (kind === "newest" || kind === "onSale") onChange({ kind });
    else onChange({ kind, value: kind === "material" ? materials[0] ?? "" : kind === "pattern" ? patterns[0] ?? "" : kind === "usage" ? usages[0] ?? "" : "" });
  };
  return (
    <div>
      <span className="mb-1 block text-xs font-bold">منبع</span>
      <div className="flex flex-wrap gap-1">
        {kinds.map((k) => (
          <button key={k.key} type="button" onClick={() => setKind(k.key)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${source.kind === k.key ? "bg-modi-purple-800 text-white" : "bg-white"}`}>
            {k.label}
          </button>
        ))}
      </div>
      <div className="mt-2">
        {source.kind === "material" && (
          <select value={source.value} onChange={(e) => onChange({ kind: "material", value: e.target.value })} className={inputCls}>
            {materials.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        {source.kind === "pattern" && (
          <select value={source.value} onChange={(e) => onChange({ kind: "pattern", value: e.target.value })} className={inputCls}>
            {patterns.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        {source.kind === "usage" && (
          <select value={source.value} onChange={(e) => onChange({ kind: "usage", value: e.target.value })} className={inputCls}>
            {usages.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        {source.kind === "query" && (
          <input value={source.value} onChange={(e) => onChange({ kind: "query", value: e.target.value })} placeholder="مثلاً کرپ حریر" className={inputCls} />
        )}
        {source.kind === "manual" && (
          <Field label="کدهای محصول (SKU) به ترتیب نمایش — با «،» جدا کنید">
            <input
              value={source.skus.join("، ")}
              onChange={(e) => onChange({ kind: "manual", skus: e.target.value.split(/[،,\s]+/).map((s) => s.trim()).filter(Boolean) })}
              placeholder="1001، 1005، 1201"
              dir="ltr"
              className={`${inputCls} text-left`}
            />
          </Field>
        )}
      </div>
    </div>
  );
}
