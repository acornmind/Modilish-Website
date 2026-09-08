import type { AdminIconName } from "./icons";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminIconName;
  /** key into the live badge-count map built in AdminShell */
  badgeKey?: "orders" | "reviews";
};

// Route map — docs/admin-spec.md §3.1. Order matches the sidebar wireframe.
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "پیشخوان", icon: "dashboard" },
  { href: "/admin/orders", label: "سفارش‌ها", icon: "orders", badgeKey: "orders" },
  { href: "/admin/products", label: "محصولات", icon: "products" },
  { href: "/admin/attributes", label: "ویژگی‌های پارچه", icon: "attributes" },
  { href: "/admin/home", label: "صفحه اصلی", icon: "home" },
  { href: "/admin/offer", label: "فروش فوق‌العاده", icon: "offer" },
  { href: "/admin/magazine", label: "مجله", icon: "magazine" },
  { href: "/admin/pages", label: "صفحات", icon: "pages" },
  { href: "/admin/customers", label: "مشتریان", icon: "customers" },
  { href: "/admin/reviews", label: "دیدگاه‌ها", icon: "reviews", badgeKey: "reviews" },
  { href: "/admin/marketing", label: "بازاریابی", icon: "marketing" },
  { href: "/admin/sms", label: "پیامک", icon: "sms" },
  { href: "/admin/navigation", label: "منو و فوتر", icon: "navigation" },
  { href: "/admin/media", label: "رسانه", icon: "media" },
  { href: "/admin/settings", label: "تنظیمات", icon: "settings" },
];

// Bottom tab bar on mobile (< 1024px) — §3.2. The remaining sections
// (everything not in this list) surface in the "بیشتر" sheet.
export const mobileTabHrefs = ["/admin", "/admin/orders", "/admin/products"];

export function isNavActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}
