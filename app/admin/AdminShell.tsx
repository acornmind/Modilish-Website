"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import AdminIcon from "./icons";
import { adminNav, isNavActive, mobileTabHrefs } from "./nav";
import { logoutAction } from "@/lib/authActions";
import { markNotificationsReadAction } from "@/lib/orderActions";
import { formatOrderTime } from "@/lib/orders";
import type { Notification } from "@/lib/orderStore";
import SearchPalette from "./_components/SearchPalette";

type Notif = Notification & { read: boolean };

const toneDot: Record<Notif["tone"], string> = {
  purple: "bg-modi-purple-800",
  warn: "bg-modi-warning",
  danger: "bg-modi-danger",
  info: "bg-modi-info",
};

// "Section counts appear as small badges (orders awaiting action, reviews
// pending)" — §3.2. Badges, the bell list and the signed-in user are computed
// server-side in app/admin/(shell)/layout.tsx and passed in.
export default function AdminShell({
  children,
  badges: badgeCounts,
  notifications,
  user,
}: {
  children: React.ReactNode;
  badges: { orders: number; reviews: number };
  notifications: { items: Notif[]; unread: number };
  user: { name: string; role: string; sessions: number };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [, start] = useTransition();

  // Close any open sheet/menu on route change. Done during render (React's
  // documented pattern for "adjusting state when a prop changes") rather
  // than in an effect, which would cause an extra commit.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMoreOpen(false);
    setUserMenuOpen(false);
    setBellOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pageTitle =
    pathname.startsWith("/admin/notifications") ? "اعلان‌ها" : adminNav.find((item) => isNavActive(pathname, item.href))?.label ?? "پیشخوان";
  const moreItems = adminNav.filter((item) => !mobileTabHrefs.includes(item.href));

  const markAll = () =>
    start(async () => {
      await markNotificationsReadAction();
      router.refresh();
    });
  const openNotif = (n: Notif) => {
    setBellOpen(false);
    if (!n.read) start(async () => { await markNotificationsReadAction([n.id]); router.refresh(); });
  };

  const bellBadge = notifications.unread > 0 && (
    <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c40000] px-1 text-[9px] font-bold text-white">
      {notifications.unread.toLocaleString("fa-IR")}
    </span>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f4f8] lg:flex lg:items-start">
      {/* ---- desktop sidebar ---- */}
      <aside className="hidden w-[264px] shrink-0 border-e border-[#e4dfec] bg-white lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <Link href="/admin" className="flex items-center px-6 py-6">
          <Image src="/img/mobile-logo.png" alt="مدیلیش" width={100} height={42} className="h-8 w-auto" />
        </Link>
        <nav className="flex flex-col gap-1 px-3 pb-6">
          {adminNav.map((item) => {
            const active = isNavActive(pathname, item.href);
            const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm transition ${
                  active ? "bg-modi-purple-800 font-bold text-white" : "text-[#2b2740] hover:bg-modi-purple-200"
                }`}
              >
                <AdminIcon name={item.icon} className={active ? "text-white" : "text-modi-purple-800"} />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${active ? "bg-white/25 text-white" : "bg-[#c40000] text-white"}`}>
                    {badge.toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-h-screen flex-1 lg:min-w-0">
        {/* ---- desktop top bar ---- */}
        <div className="sticky top-0 z-20 hidden items-center gap-4 border-b border-[#e4dfec] bg-white px-8 py-4 lg:flex">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="relative flex h-10 max-w-md flex-1 items-center rounded-xl bg-modi-gray-500 pr-9 pl-14 text-start text-sm text-modi-gray-900 hover:bg-modi-gray-700/60"
            aria-label="جستجوی سراسری"
          >
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <AdminIcon name="search" size={16} />
            </span>
            جستجو در سفارش‌ها، محصولات، مشتریان…
            <kbd className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 rounded-md border border-[#e4dfec] bg-white px-1.5 py-0.5 text-[10px] text-modi-gray-900">Ctrl K</kbd>
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label="اعلان‌ها"
              aria-expanded={bellOpen}
              onClick={() => { setBellOpen((v) => !v); setUserMenuOpen(false); }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-modi-purple-800 hover:bg-modi-purple-200"
            >
              <AdminIcon name="bell" size={19} />
              {bellBadge}
            </button>
            {bellOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
                <div className="absolute left-0 top-12 z-20 w-96 rounded-2xl bg-white p-2 shadow-[0_8px_24px_-8px_rgba(43,39,64,0.4)]">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="text-sm font-bold">اعلان‌ها {notifications.unread > 0 && <span className="text-xs font-normal text-modi-gray-900">· {notifications.unread.toLocaleString("fa-IR")} خوانده‌نشده</span>}</p>
                    {notifications.unread > 0 && <button type="button" onClick={markAll} className="text-[11px] font-bold text-modi-purple-800">همه خوانده شد</button>}
                  </div>
                  {notifications.items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-modi-gray-900">همه‌چیز مرتب است — اعلانی نیست.</p>
                  ) : (
                    <ul className="max-h-96 overflow-y-auto">
                      {notifications.items.map((n) => (
                        <li key={n.id}>
                          <Link href={n.href} onClick={() => openNotif(n)} className={`flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-modi-purple-200/60 ${n.read ? "opacity-70" : ""}`}>
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[n.tone]} ${n.read ? "opacity-40" : ""}`} />
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-xs ${n.read ? "" : "font-bold"}`}>{n.title}</span>
                              {n.text && <span className="block truncate text-[11px] text-modi-gray-900">{n.text}</span>}
                            </span>
                            <span className="shrink-0 text-[10px] text-modi-gray-900">{formatOrderTime(n.at)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href="/admin/notifications" onClick={() => setBellOpen(false)} className="mt-1 block rounded-xl bg-modi-gray-300 py-2 text-center text-xs font-bold text-modi-purple-800 hover:bg-modi-purple-200">
                    همه اعلان‌ها و تنظیمات
                  </Link>
                </div>
              </>
            )}
          </div>

          <a href="/" target="_blank" rel="noreferrer" className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-modi-purple-200 px-4 text-sm font-bold text-modi-purple-800 hover:bg-modi-purple-500 hover:text-white">
            مشاهده سایت
            <AdminIcon name="external" size={15} />
          </a>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => { setUserMenuOpen((v) => !v); setBellOpen(false); }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-modi-purple-800 text-white"
              aria-label="منوی کاربر"
              aria-expanded={userMenuOpen}
            >
              <AdminIcon name="user" size={18} />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute left-0 top-12 z-20 w-56 rounded-xl bg-white p-2 text-sm shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
                  <p className="px-3 py-2 text-xs text-modi-gray-900">
                    <span className="block font-bold text-[#2b2740]">{user.name}</span>
                    {user.role}
                    {user.sessions > 1 && ` · ${user.sessions.toLocaleString("fa-IR")} دستگاه فعال`}
                  </p>
                  <Link href="/admin/settings/users" className="block rounded-lg px-3 py-2 text-[#2b2740] hover:bg-modi-purple-200">حساب من و کاربران</Link>
                  <Link href="/admin/notifications" className="block rounded-lg px-3 py-2 text-[#2b2740] hover:bg-modi-purple-200">تنظیمات اعلان</Link>
                  <button type="button" onClick={() => start(() => logoutAction(false))} className="block w-full rounded-lg px-3 py-2 text-start text-[#2b2740] hover:bg-modi-purple-200">خروج</button>
                  <button type="button" onClick={() => start(() => logoutAction(true))} className="block w-full rounded-lg px-3 py-2 text-start text-modi-danger hover:bg-modi-danger-bg">خروج از همه دستگاه‌ها</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ---- mobile top bar ---- */}
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-[#e4dfec] bg-white px-3 lg:hidden">
          <button type="button" aria-label="بخش‌های بیشتر" onClick={() => setMoreOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-modi-purple-800 text-white">
            <AdminIcon name="hamburger" size={18} />
          </button>
          <p className="flex-1 text-center text-sm font-bold">{pageTitle}</p>
          <button type="button" aria-label="جستجو" onClick={() => setSearchOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl text-modi-purple-800">
            <AdminIcon name="search" size={18} />
          </button>
          <Link href="/admin/notifications" aria-label="اعلان‌ها" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-modi-purple-800">
            <AdminIcon name="bell" size={19} />
            {bellBadge}
          </Link>
        </div>

        <main className="min-h-[calc(100vh-64px)] px-3 py-4 pb-24 lg:min-h-screen lg:px-8 lg:py-8 lg:pb-8">{children}</main>

        {/* ---- mobile bottom tab bar ---- */}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[#e4dfec] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
          {adminNav
            .filter((item) => mobileTabHrefs.includes(item.href))
            .map((item) => {
              const active = isNavActive(pathname, item.href);
              const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
              return (
                <Link key={item.href} href={item.href} className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? "font-bold text-modi-purple-800" : "text-modi-gray-900"}`}>
                  <AdminIcon name={item.icon} size={19} />
                  {item.label}
                  {badge > 0 && (
                    <span className="absolute end-[26%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c40000] px-1 text-[9px] font-bold text-white">
                      {badge.toLocaleString("fa-IR")}
                    </span>
                  )}
                </Link>
              );
            })}
          <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-modi-gray-900">
            <AdminIcon name="hamburger" size={19} />
            بیشتر
          </button>
        </nav>
      </div>

      {/* ---- "بیشتر" sheet (mobile) ---- */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-8">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-modi-gray-500" />
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">همه بخش‌ها</p>
              <button type="button" aria-label="بستن" onClick={() => setMoreOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-modi-gray-900">
                <AdminIcon name="close" size={16} />
              </button>
            </div>
            <p className="mb-3 rounded-xl bg-modi-gray-300 px-3 py-2 text-xs text-modi-gray-900">
              <span className="font-bold text-[#2b2740]">{user.name}</span> · {user.role}
            </p>
            <div className="grid grid-cols-1 gap-1">
              {moreItems.map((item) => {
                const active = isNavActive(pathname, item.href);
                const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${active ? "bg-modi-purple-800 font-bold text-white" : "text-[#2b2740]"}`}>
                    <AdminIcon name={item.icon} className={active ? "text-white" : "text-modi-purple-800"} />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c40000] px-1 text-[11px] font-bold text-white">{badge.toLocaleString("fa-IR")}</span>
                    )}
                  </Link>
                );
              })}
              <Link href="/admin/notifications" onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#2b2740]">
                <AdminIcon name="bell" className="text-modi-purple-800" />
                <span className="flex-1">اعلان‌ها</span>
                {notifications.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c40000] px-1 text-[11px] font-bold text-white">{notifications.unread.toLocaleString("fa-IR")}</span>}
              </Link>
              <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#2b2740]">
                <AdminIcon name="external" className="text-modi-purple-800" />
                مشاهده سایت
              </a>
              <button type="button" onClick={() => start(() => logoutAction(false))} className="flex items-center gap-3 rounded-xl px-3 py-3 text-start text-sm text-modi-danger">
                <AdminIcon name="close" className="text-modi-danger" />
                خروج
              </button>
            </div>
          </div>
        </div>
      )}

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
