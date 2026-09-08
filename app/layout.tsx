import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { Toaster } from "@/lib/toast";
import StorefrontChrome from "@/components/StorefrontChrome";
import { ensureHydrated } from "@/lib/productStore";
import { getSite } from "@/lib/siteStore";
import { menuValuesFor } from "@/lib/attributes";

// Site title/description come from Settings → سئو (admin).
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = getSite().settings;
  return {
    title: { default: seo.homeTitle, template: seo.titleTemplate },
    description: seo.defaultDescription,
    robots: seo.robotsIndex ? undefined : { index: false, follow: false },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Applies any admin-saved product edits before the tree renders — see
  // lib/productStore.ts for why this can't live inside lib/products.ts.
  ensureHydrated();
  const { settings } = getSite();

  // what the admin controls that the client-side cart needs (§4.11, §4.14)
  const pricing = {
    rules: settings.discountRules,
    shipping: settings.shipping,
    methodPrice: settings.delivery.methods.find((m) => m.active)?.priceToman ?? 0,
    strings: settings.strings,
  };

  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-screen flex-col">
        <CartProvider pricing={pricing}>
          <StorefrontChrome
            header={settings.header}
            footer={settings.footer}
            store={settings.store}
            menuValues={menuValuesFor(settings.attributeMeta)}
          >
            {children}
          </StorefrontChrome>
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
