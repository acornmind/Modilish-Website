import Link from "next/link";
import AdminIcon from "../icons";

// "Quick actions — «افزودن پارچه», «نوشتن مطلب», «ویرایش صفحه اصلی»." — §4.1.
const actions = [
  { href: "/admin/products/new", label: "افزودن پارچه", icon: "products" as const },
  { href: "/admin/magazine/new", label: "نوشتن مطلب", icon: "magazine" as const },
  { href: "/admin/home", label: "ویرایش صفحه اصلی", icon: "home" as const },
];

export default function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center gap-2 rounded-xl bg-modi-purple-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-modi-purple-500"
        >
          <AdminIcon name={a.icon} size={17} />
          {a.label}
        </Link>
      ))}
    </div>
  );
}
