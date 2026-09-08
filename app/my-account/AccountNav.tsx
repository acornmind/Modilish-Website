"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountNav } from "./nav";

function NavIcon({ name }: { name: string }) {
  const c = "currentColor";
  switch (name) {
    case "orders":
      return (
        <path
          d="M6 2h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
        />
      );
    case "pin":
      return (
        <path
          d="M12 2c3.9 0 6 2.7 6 6 0 4-6 12-6 12S6 12 6 8c0-3.3 2.1-6 6-6zm0 4a2 2 0 100 4 2 2 0 000-4z"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
        />
      );
    case "wallet":
      return (
        <path
          d="M3 7h16a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1h13"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
        />
      );
    case "heart":
      return (
        <path
          d="M12 20S3.5 14 3.5 8.5C3.5 5.4 5.9 3.5 8 3.5c1.9 0 3.3 1.1 4 2 .7-.9 2.1-2 4-2 2.1 0 4.5 1.9 4.5 5C20.5 14 12 20 12 20z"
          fill={c}
          stroke={c}
        />
      );
    case "chat":
      return (
        <path
          d="M4 5h16v11H8l-4 4V5z"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
        />
      );
    case "star":
      return (
        <path
          d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z"
          fill={c}
        />
      );
    case "user":
      return (
        <path
          d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8c0-3.9 3.1-6 7-6s7 2.1 7 6"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
        />
      );
    case "logout":
      return (
        <path
          d="M14 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M9 12h11m-4-4l4 4-4 4"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
        />
      );
    default: // gauge
      return (
        <path
          d="M12 13l4-4M4 13a8 8 0 1116 0"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      );
  }
}

/**
 * Account navigation — a horizontally scrollable pill bar on mobile (so the
 * page content is visible without scrolling past a full-height list) and
 * the classic vertical sidebar on desktop.
 */
export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="حساب کاربری"
      className="woocommerce-MyAccount-navigation no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:rounded-2xl lg:bg-white lg:p-2 lg:shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]"
    >
      {accountNav.map((item) => {
        const active =
          item.href === "/my-account"
            ? pathname === "/my-account"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm transition lg:justify-end lg:rounded-xl lg:px-4 lg:py-3 ${
              active
                ? "bg-modi-purple-800 text-white"
                : "bg-white text-[#2b2740] shadow-[0_2px_10px_-6px_rgba(43,39,64,0.35)] lg:bg-transparent lg:shadow-none lg:hover:bg-modi-purple-200"
            }`}
          >
            <span className="lg:order-2">{item.label}</span>
            {item.soon && (
              <span
                className={`rounded-full px-1.5 text-[10px] lg:order-1 ${
                  active ? "bg-white/20 text-white" : "bg-modi-gray-500 text-modi-gray-900"
                }`}
              >
                به‌زودی
              </span>
            )}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-hidden
              className={`lg:order-3 ${active ? "text-white" : "text-modi-purple-800"}`}
            >
              <NavIcon name={item.icon} />
            </svg>
          </Link>
        );
      })}
    </nav>
  );
}
