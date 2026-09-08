"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Notification } from "@/lib/orderStore";
import { notificationEvents, type NotificationPref } from "@/lib/siteContent";
import { markNotificationsReadAction } from "@/lib/orderActions";
import { saveSettingsAction } from "@/lib/siteActions";
import { formatJalali } from "@/lib/orders";
import { faNum } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import { BackendNote, btnPrimary, btnSoft, Card, EmptyState, PageHeader, SaveBar } from "./ui";

type Notif = Notification & { read: boolean };

const toneDot: Record<Notif["tone"], string> = { purple: "bg-modi-purple-800", warn: "bg-modi-warning", danger: "bg-modi-danger", info: "bg-modi-info" };
const eventLabel = (key: string) => notificationEvents.find((e) => e.key === key)?.label ?? key;

/** اعلان‌ها — docs/admin-spec.md §4.15: list + "which events reach me on which channel". */
export default function NotificationsPanel({ items, unread, prefs: p0, smsConnected }: { items: Notif[]; unread: number; prefs: Record<string, NotificationPref>; smsConnected: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"unread" | "all">(unread > 0 ? "unread" : "all");
  const [prefs, setPrefs] = useState(p0);
  const [saved, setSaved] = useState(p0);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved);

  const visible = items.filter((n) => filter === "all" || !n.read);
  const setPref = (key: string, ch: keyof NotificationPref, v: boolean) =>
    setPrefs({ ...prefs, [key]: { ...(prefs[key] ?? { inApp: true, sms: false, push: false }), [ch]: v } });

  return (
    <div>
      <PageHeader
        title="اعلان‌ها"
        subtitle={unread > 0 ? `${faNum(unread)} اعلان خوانده‌نشده` : "همه اعلان‌ها خوانده شده‌اند"}
        actions={unread > 0 && (
          <button type="button" disabled={pending} onClick={() => start(async () => { await markNotificationsReadAction(); toast("همه خوانده شد"); router.refresh(); })} className={btnSoft}>
            همه را خوانده علامت بزن
          </button>
        )}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div>
          <div className="mb-3 flex gap-1">
            {([["unread", "خوانده‌نشده"], ["all", "همه"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === k ? "bg-modi-purple-800 text-white" : "bg-white"}`}>
                {l} <span className="opacity-70">{faNum(k === "all" ? items.length : unread)}</span>
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="rounded-2xl bg-white"><EmptyState text={filter === "unread" ? "اعلان خوانده‌نشده‌ای نیست" : "در هفت روز گذشته اعلانی ثبت نشده"} small /></div>
          ) : (
            <ul className="space-y-2">
              {visible.map((n) => (
                <li key={n.id} className={`rounded-2xl bg-white p-3 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] ${n.read ? "opacity-75" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${toneDot[n.tone]} ${n.read ? "opacity-40" : ""}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.read ? "" : "font-bold"}`}>{n.title}</p>
                      {n.text && <p className="mt-0.5 text-xs leading-6 text-modi-gray-900">{n.text}</p>}
                      <p className="mt-1 text-[11px] text-modi-gray-900">{eventLabel(n.event)} · {formatJalali(n.at)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Link href={n.href} onClick={() => !n.read && start(async () => { await markNotificationsReadAction([n.id]); router.refresh(); })} className={`${btnSoft} h-8 text-xs`}>باز کردن</Link>
                      {!n.read && (
                        <button type="button" disabled={pending} onClick={() => start(async () => { await markNotificationsReadAction([n.id]); router.refresh(); })} className="text-[11px] text-modi-gray-900 hover:text-modi-purple-800">خوانده شد</button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card title="کدام رویداد، از کدام کانال">
          <p className="mb-3 text-[11px] leading-5 text-modi-gray-900">اعلان داخل مدیریت همیشه در دسترس است؛ پیامک به شماره کاربران فعال فرستاده می‌شود و «پوش» با نصب مدیریت روی موبایل (PWA) فعال می‌شود.</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-modi-gray-900">
                <th className="py-2 text-start font-bold">رویداد</th>
                <th className="py-2 font-bold">داخل مدیریت</th>
                <th className="py-2 font-bold">پیامک</th>
                <th className="py-2 font-bold">پوش</th>
              </tr>
            </thead>
            <tbody>
              {notificationEvents.map((e) => {
                const p = prefs[e.key] ?? { inApp: true, sms: false, push: false };
                return (
                  <tr key={e.key} className="border-t border-[#f3f0f7]">
                    <td className="py-2">{e.label}</td>
                    {(["inApp", "sms", "push"] as const).map((ch) => (
                      <td key={ch} className="py-2 text-center">
                        <input type="checkbox" checked={p[ch]} onChange={(ev) => setPref(e.key, ch, ev.target.checked)} aria-label={`${e.label} — ${ch}`} className="h-4 w-4 accent-modi-purple-800" />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!smsConnected && Object.values(prefs).some((p) => p.sms) && (
            <div className="mt-3"><BackendNote>کاوه‌نگار متصل نیست؛ پیامک‌های اعلان تا اتصال در <Link href="/admin/settings/integrations" className="font-bold underline">اتصال‌ها</Link> فقط در گزارش پیامک ثبت می‌شوند.</BackendNote></div>
          )}
          <SaveBar
            dirty={dirty}
            saving={pending}
            onSave={() => start(async () => { await saveSettingsAction("notificationPrefs", prefs); setSaved(prefs); toast("ذخیره شد"); router.refresh(); })}
            onCancel={() => setPrefs(saved)}
          />
          <span className="hidden">{btnPrimary}</span>
        </Card>
      </div>
    </div>
  );
}
