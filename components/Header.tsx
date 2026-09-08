"use client";

import Link from "next/link";
import Image from "next/image";
import Icon from "./Icon";
import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCart, useStrings } from "@/lib/cart";
import {
  dimensionLabels,
  dimensionValues,
  slugify,
  type Dimension,
} from "@/lib/taxonomy";
import type { SiteSettings } from "@/lib/siteContent";

const taxonomyGroups: Dimension[] = ["material", "pattern", "usage"];

/* The search term currently in the URL (?s= on /search, ?q= on /shop) — read
   as an external store so the box can mirror it without an effect. */
const subscribeUrl = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};
const readUrlTerm = () => {
  const sp = new URLSearchParams(window.location.search);
  return sp.get("s") ?? sp.get("q") ?? "";
};

/** Storefront header — menu, search placeholder, mega-menu sizes and the
 *  announcement bar come from admin → منو و فوتر (§4.12). */
export default function Header({
  settings,
  menuValues,
}: {
  settings: SiteSettings["header"];
  /** mega-menu values per dimension, ordered/filtered in admin → ویژگی‌های پارچه */
  menuValues?: Record<Dimension, string[]>;
}) {
  const menuItems = settings.menuItems;
  const t = useStrings();
  const valuesFor = (dim: Dimension) => menuValues?.[dim] ?? dimensionValues(dim).map((v) => v.name);
  const [open, setOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Dimension | null>(null);
  const [desktopCatsOpen, setDesktopCatsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // re-renders on navigation → re-reads the URL
  const { count } = useCart();

  const urlTerm = useSyncExternalStore(subscribeUrl, readUrlTerm, () => "");
  const [term, setTerm] = useState(urlTerm);
  const [seenUrlTerm, setSeenUrlTerm] = useState(urlTerm);
  if (urlTerm !== seenUrlTerm) {
    // the shopper navigated to a different query — mirror it in the box
    setSeenUrlTerm(urlTerm);
    setTerm(urlTerm);
  }
  const onShop = pathname === "/shop";

  const close = () => {
    setOpen(false);
    setCatsOpen(false);
    setExpanded(null);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (q) router.push(`/search?s=${encodeURIComponent(q)}`);
  };

  const shopItem = menuItems.find((m) => m.href === "/shop");
  const otherItems = menuItems.filter((m) => m.href !== "/shop");

  return (
    <header className="main-menu-header sticky top-0 z-20 bg-white">
      {settings.announcement.enabled && settings.announcement.text && (
        <Link
          href={settings.announcement.href || "/"}
          className="block bg-modi-purple-800 px-4 py-1.5 text-center text-xs font-bold text-white"
        >
          {settings.announcement.text}
        </Link>
      )}
      {/* ---- desktop bar (lg and up) ---- */}
      <div className="modi-container hidden h-20 items-center gap-8 lg:flex lg:px-8">
        <Link href="/" className="shrink-0">
          <Image
            src="/img/mobile-logo.png"
            alt="مدیلیش"
            width={100}
            height={42}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav className="flex shrink-0 items-center gap-7 text-sm font-bold text-[#2b2740]">
          <div
            className="relative"
            onMouseEnter={() => setDesktopCatsOpen(true)}
            onMouseLeave={() => setDesktopCatsOpen(false)}
          >
            <button
              className="flex items-center gap-1.5 py-2"
              onClick={() => setDesktopCatsOpen((v) => !v)}
            >
              دسته بندی
              <Chevron open={desktopCatsOpen} />
            </button>
            {desktopCatsOpen && (
              <div className="absolute right-0 top-full z-30 w-[640px] rounded-2xl bg-white p-6 shadow-[0_16px_40px_-12px_rgba(43,39,64,0.35)]">
                <div className="grid grid-cols-3 gap-6 text-right">
                  {taxonomyGroups.map((dim) => (
                    <div key={dim}>
                      <p className="mb-3 text-xs font-bold text-modi-purple-800">
                        {dimensionLabels[dim]}
                      </p>
                      <ul className="space-y-2.5 text-xs font-normal text-modi-gray-900">
                        {valuesFor(dim)
                          .slice(0, settings.megaDesktop)
                          .map((name) => (
                            <li key={name}>
                              <Link
                                href={
                                  dim === "material"
                                    ? `/materials/${encodeURIComponent(slugify(name))}`
                                    : `/shop?${dim}=${encodeURIComponent(slugify(name))}`
                                }
                                onClick={() => setDesktopCatsOpen(false)}
                                className="hover:text-modi-purple-800"
                              >
                                {dim === "material" ? t("menuLabel", "خرید پارچه %s", name) : name}
                              </Link>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <Link
                  href="/shop"
                  onClick={() => setDesktopCatsOpen(false)}
                  className="mt-5 block border-t border-modi-gray-500 pt-4 text-xs font-bold text-modi-purple-800"
                >
                  همه محصولات
                </Link>
              </div>
            )}
          </div>
          {shopItem && (
            <Link
              href={shopItem.href}
              aria-current={onShop ? "page" : undefined}
              className="rounded-full bg-modi-purple-800 px-5 py-2 text-white transition hover:bg-modi-purple-500"
            >
              {shopItem.label}
            </Link>
          )}
          {otherItems.map((m) => (
            <Link key={m.href + m.label} href={m.href} className="hover:text-modi-purple-800">
              {m.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="relative max-w-md flex-1">
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-60">
            <Icon src="/img/search.svg" size={15} />
          </span>
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={settings.searchPlaceholder}
            aria-label="جستجو"
            className="h-11 w-full rounded-xl bg-modi-gray-500 pl-10 pr-10 text-sm outline-none placeholder:text-modi-gray-900"
          />
          {term && (
            <button
              type="button"
              aria-label="پاک کردن جستجو"
              onClick={() => setTerm("")}
              className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-base text-modi-gray-900 hover:bg-white"
            >
              ×
            </button>
          )}
        </form>

        <Link
          href="/cart"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-modi-purple-800 hover:bg-modi-purple-200"
          aria-label="سبد خرید"
        >
          <Icon src="/img/cart.svg" size={21} />
          {count > 0 && (
            <span className="absolute -left-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-modi-purple-800 px-1 text-[10px] text-white">
              {count.toLocaleString("fa-IR")}
            </span>
          )}
        </Link>
      </div>

      {/* ---- mobile bar (below lg) ---- */}
      <div
        dir="ltr"
        className="flex h-16 items-center justify-between gap-1.5 px-2.5 shadow-sm lg:hidden"
      >
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-modi-purple-800 text-white"
          aria-label="منو"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
              <path
                d="M2 2l12 12M14 2L2 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="18" height="13" viewBox="0 0 18 14" aria-hidden>
              <path
                d="M1 1h16M1 7h16M1 13h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        <Link
          href="/cart"
          onClick={close}
          className="relative flex h-10 w-9 shrink-0 items-center justify-center text-modi-purple-800"
          aria-label="سبد خرید"
        >
          <Icon src="/img/cart.svg" size={20} />
          {count > 0 && (
            <span className="absolute -left-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-modi-purple-800 px-1 text-[10px] text-white">
              {count.toLocaleString("fa-IR")}
            </span>
          )}
        </Link>

        <form onSubmit={submitSearch} dir="rtl" className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-60">
            <Icon src="/img/search.svg" size={15} />
          </span>
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={settings.searchPlaceholder}
            aria-label="جستجو"
            className="h-10 w-full rounded-xl bg-modi-gray-500 pl-9 pr-10 text-sm outline-none placeholder:text-modi-gray-900"
          />
          {term && (
            <button
              type="button"
              aria-label="پاک کردن جستجو"
              onClick={() => setTerm("")}
              className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-base text-modi-gray-900"
            >
              ×
            </button>
          )}
        </form>

        <Link href="/" onClick={close} className="flex shrink-0 items-center">
          <Image
            src="/img/mobile-logo.png"
            alt="مدیلیش"
            width={80}
            height={34}
            className="h-6 w-auto"
            priority
          />
        </Link>
      </div>

      {open && (
        <>
          <nav className="main-menu block">
            <ul>
              {shopItem && (
                <li>
                  <Link href={shopItem.href} onClick={close} className="menu-shop-cta">
                    <Icon src="/img/add-t-cart-light.svg" size={16} />
                    {shopItem.label}
                  </Link>
                </li>
              )}
              <li className="menu-item-has-children">
                <button
                  type="button"
                  aria-expanded={catsOpen}
                  className={catsOpen ? "active" : ""}
                  onClick={() => {
                    setCatsOpen((v) => !v);
                    setExpanded(null);
                  }}
                >
                  دسته بندی
                  <Chevron open={catsOpen} />
                </button>
                {catsOpen && (
                  <ul className="sub-menu block">
                    {taxonomyGroups.map((dim) => (
                      <li key={dim} className="menu-item-has-children">
                        <button
                          type="button"
                          aria-expanded={expanded === dim}
                          className={expanded === dim ? "active" : ""}
                          onClick={() =>
                            setExpanded((v) => (v === dim ? null : dim))
                          }
                        >
                          {dimensionLabels[dim]}
                          <Chevron open={expanded === dim} />
                        </button>
                        {expanded === dim && (
                          <ul className="sub-menu block">
                            {valuesFor(dim)
                              .slice(0, settings.megaMobile)
                              .map((name) => (
                                <li key={name}>
                                  <Link
                                    href={
                                      dim === "material"
                                        ? `/materials/${encodeURIComponent(slugify(name))}`
                                        : `/shop?${dim}=${encodeURIComponent(slugify(name))}`
                                    }
                                    onClick={close}
                                  >
                                    {dim === "material" ? t("menuLabel", "خرید پارچه %s", name) : name}
                                  </Link>
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    ))}
                    <li>
                      <Link href="/shop" onClick={close}>
                        همه محصولات
                      </Link>
                    </li>
                  </ul>
                )}
              </li>

              {otherItems.map((m) => (
                <li key={m.href + m.label}>
                  <Link href={m.href} onClick={close}>
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="backdrop-main-menu block" onClick={close} />
        </>
      )}
    </header>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "0.3s",
        color: "#6b3fa0",
      }}
    >
      <path
        d="M2 4l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
