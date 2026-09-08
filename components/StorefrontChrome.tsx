"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import type { SiteSettings } from "@/lib/siteContent";
import type { Dimension } from "@/lib/taxonomy";

// The admin (/admin) has its own shell (app/admin/AdminShell.tsx) — the
// storefront's Header/Footer only wrap customer-facing pages. Header/footer
// content comes from Settings (admin → منو و فوتر / تنظیمات) via the root layout.
export default function StorefrontChrome({
  children,
  header,
  footer,
  store,
  menuValues,
}: {
  children: React.ReactNode;
  header: SiteSettings["header"];
  footer: SiteSettings["footer"];
  store: SiteSettings["store"];
  menuValues: Record<Dimension, string[]>;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Header settings={header} menuValues={menuValues} />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer settings={footer} store={store} />
    </>
  );
}
