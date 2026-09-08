export type AccountNavItem = {
  label: string;
  href: string;
  icon: string;
  /** not available in the demo — shown, but badged so it isn't a surprise */
  soon?: boolean;
};

/** icon = key into the small inline icon set in AccountNav.tsx */
export const accountNav: AccountNavItem[] = [
  { label: "پیشخوان", href: "/my-account", icon: "gauge" },
  { label: "سفارش‌های من", href: "/my-account/orders", icon: "orders" },
  { label: "آدرس‌های من", href: "/my-account/addresses", icon: "pin" },
  { label: "علاقه‌مندی‌ها", href: "/my-account/wishlist", icon: "heart" },
  { label: "اطلاعات کاربری", href: "/my-account/account-details", icon: "user" },
  { label: "کیف پول من", href: "/my-account/wallet", icon: "wallet", soon: true },
  { label: "پیام‌ها", href: "/my-account/messages", icon: "chat", soon: true },
  { label: "نظرسنجی", href: "/my-account/survey", icon: "star", soon: true },
  { label: "خروج از حساب", href: "/my-account/logout", icon: "logout" },
];
