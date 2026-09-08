"use client";

// Small admin form/UI primitives — one look for every editor (docs/admin-spec.md §5).
import Link from "next/link";
import type { ReactNode } from "react";

export const card = "rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:p-5";
export const inputCls =
  "h-10 w-full rounded-xl bg-modi-gray-300 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500 disabled:opacity-60";
export const textareaCls =
  "min-h-24 w-full rounded-xl bg-modi-gray-300 p-3 text-sm leading-7 outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500";
export const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-modi-purple-800 px-4 text-sm font-bold text-white hover:bg-modi-purple-500 disabled:opacity-60";
export const btnSoft =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-modi-purple-200 px-4 text-sm font-bold text-modi-purple-800 hover:bg-modi-purple-500 hover:text-white disabled:opacity-60";
export const btnGhost =
  "inline-flex h-9 items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold text-modi-gray-900 hover:bg-modi-gray-500";
export const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-xl bg-modi-danger-bg px-4 text-sm font-bold text-modi-danger hover:bg-modi-danger hover:text-white disabled:opacity-60";

export function Card({ title, children, className = "", action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`${card} ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, required, children, className = "" }: { label: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className={`mb-1 block text-xs font-bold ${required ? "require" : ""}`}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-5 text-modi-gray-900">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-start text-sm hover:bg-modi-gray-300"
    >
      <span>
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-[11px] text-modi-gray-900">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-modi-purple-800" : "bg-modi-gray-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "right-0.5" : "right-[22px]"}`} />
      </span>
    </button>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        {back && (
          <Link href={back.href} className="mb-1 inline-flex items-center gap-1 text-xs text-modi-purple-800">
            <svg width="7" height="11" viewBox="0 0 7 11" aria-hidden>
              <path d="M1.5 1l4 4.5-4 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {back.label}
          </Link>
        )}
        <h1 className="truncate text-base font-bold lg:text-lg">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-modi-gray-900">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            value === t.key ? "bg-modi-purple-800 text-white" : "bg-white text-[#2b2740] hover:bg-modi-purple-200"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`rounded-full px-1.5 text-[10px] ${value === t.key ? "bg-white/25" : "bg-modi-gray-500 text-modi-gray-900"}`}>
              {t.count.toLocaleString("fa-IR")}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Empty state — "illustration in the storefront style, one sentence, one primary action" (§5). */
export function EmptyState({ text, action, small }: { text: string; action?: ReactNode; small?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${small ? "py-8" : "py-16"}`}>
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md shadow-modi-gray-50">
        <svg width="9" height="34" viewBox="0 0 11 62.367" aria-hidden>
          <line y2="40" transform="translate(5.5 3.5)" fill="none" stroke="#a58bc5" strokeLinecap="round" strokeWidth="7" />
          <circle cx="5.5" cy="56.8" r="5.5" fill="#a58bc5" />
        </svg>
      </span>
      <p className="max-w-sm text-sm leading-6 text-modi-gray-900">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A note that a feature needs a backend the app doesn't have yet — honest, not a dead end. */
export function BackendNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-modi-info-bg px-3 py-2 text-xs leading-6 text-modi-info">
      {children}
    </p>
  );
}

/** Editable list of strings (paragraphs, bullets, hours…). */
export function StringList({ items, onChange, placeholder, multiline }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; multiline?: boolean }) {
  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-1.5">
          {multiline ? (
            <textarea value={it} onChange={(e) => set(i, e.target.value)} placeholder={placeholder} className={`${textareaCls} min-h-16`} />
          ) : (
            <input value={it} onChange={(e) => set(i, e.target.value)} placeholder={placeholder} className={inputCls} />
          )}
          <div className="flex shrink-0 flex-col gap-0.5">
            <button type="button" aria-label="بالا" onClick={() => move(i, -1)} className="h-5 w-7 rounded bg-modi-gray-300 text-[10px] hover:bg-modi-purple-200">▲</button>
            <button type="button" aria-label="پایین" onClick={() => move(i, 1)} className="h-5 w-7 rounded bg-modi-gray-300 text-[10px] hover:bg-modi-purple-200">▼</button>
            <button type="button" aria-label="حذف" onClick={() => onChange(items.filter((_, j) => j !== i))} className="h-5 w-7 rounded bg-modi-danger-bg text-[10px] text-modi-danger">×</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className={btnGhost}>
        + افزودن
      </button>
    </div>
  );
}

/** Editable list of {label, href} links. */
export function LinkList({ items, onChange }: { items: { label: string; href: string }[]; onChange: (v: { label: string; href: string }[]) => void }) {
  const set = (i: number, patch: Partial<{ label: string; href: string }>) =>
    onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input value={it.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="عنوان" className={inputCls} />
          <input value={it.href} onChange={(e) => set(i, { href: e.target.value })} placeholder="/shop" dir="ltr" className={`${inputCls} text-left`} />
          <button type="button" aria-label="بالا" onClick={() => move(i, -1)} className="h-8 w-8 shrink-0 rounded-lg bg-modi-gray-300 text-[10px]">▲</button>
          <button type="button" aria-label="پایین" onClick={() => move(i, 1)} className="h-8 w-8 shrink-0 rounded-lg bg-modi-gray-300 text-[10px]">▼</button>
          <button type="button" aria-label="حذف" onClick={() => onChange(items.filter((_, j) => j !== i))} className="h-8 w-8 shrink-0 rounded-lg bg-modi-danger-bg text-modi-danger">×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { label: "", href: "/" }])} className={btnGhost}>
        + افزودن لینک
      </button>
    </div>
  );
}

/** Sticky save bar — «تغییرات ذخیره نشده» with ذخیره / انصراف (§3.2). */
export function SaveBar({ dirty, saving, onSave, onCancel, saveLabel = "ذخیره" }: { dirty: boolean; saving: boolean; onSave: () => void; onCancel?: () => void; saveLabel?: string }) {
  if (!dirty && !saving) return null;
  return (
    <div className="fixed inset-x-0 bottom-[68px] z-30 px-3 lg:bottom-4 lg:right-[264px] lg:px-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl bg-[#2b2740] px-4 py-3 text-xs text-white shadow-[0_8px_24px_-8px_rgba(43,39,64,0.6)]">
        <span>تغییرات ذخیره نشده</span>
        <span className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="h-9 rounded-lg bg-white/15 px-3 font-bold hover:bg-white/25">
              انصراف
            </button>
          )}
          <button type="button" onClick={onSave} disabled={saving} className="h-9 rounded-lg bg-white px-4 font-bold text-modi-purple-800 disabled:opacity-60">
            {saving ? "در حال ذخیره…" : saveLabel}
          </button>
        </span>
      </div>
    </div>
  );
}

/** Confirm sheet naming the object + consequence (§5). */
export function ConfirmDialog({ open, title, text, confirmLabel = "تایید", danger, onConfirm, onCancel }: { open: boolean; title: string; text?: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-t-3xl bg-white p-5 lg:rounded-2xl">
        <p className="text-sm font-bold">{title}</p>
        {text && <p className="mt-2 text-xs leading-6 text-modi-gray-900">{text}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onConfirm} className={danger ? btnDanger : btnPrimary}>
            {confirmLabel}
          </button>
          <button type="button" onClick={onCancel} className={btnSoft}>
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}
