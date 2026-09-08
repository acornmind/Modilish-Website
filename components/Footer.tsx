import Link from "next/link";
import Image from "next/image";
import type { SiteSettings } from "@/lib/siteContent";

/** Global footer — content from admin → منو و فوتر and تنظیمات → فروشگاه (§4.12). */
export default function Footer({
  settings,
  store,
}: {
  settings: SiteSettings["footer"];
  store: SiteSettings["store"];
}) {
  return (
    <footer className="mt-auto bg-white pt-4 text-[13px] lg:pt-0">
      {/* ---- desktop columns (lg and up) ---- */}
      <div className="modi-container hidden border-t border-modi-gray-500 py-12 lg:grid lg:grid-cols-4 lg:gap-10 lg:px-8">
        <div>
          <Image
            src="/img/mobile-logo-footer.png"
            alt={store.name}
            width={250}
            height={143}
            className="h-16 w-auto opacity-90"
          />
          <p className="mt-4 leading-7 text-modi-gray-900">{settings.boilerplate}</p>
        </div>

        <nav className="flex flex-col gap-3">
          <h3 className="mb-1 text-sm font-bold text-[#2b2740]">لینک‌های پرکاربرد</h3>
          {settings.quickLinks.map((l) => (
            <Link key={l.href + l.label} href={l.href} className="text-modi-gray-900 hover:text-modi-purple-800">
              {l.label}
            </Link>
          ))}
        </nav>

        <div>
          <h3 className="mb-3 text-sm font-bold text-[#2b2740]">پشتیبانی</h3>
          <a href={store.telegramUrl} target="_blank" rel="noreferrer" className="block text-modi-purple-800">
            پشتیبانی تلگرام {store.telegram}
          </a>
          {store.phone && <p className="mt-2 text-modi-gray-900 tabular-nums">تلفن: {store.phone}</p>}
          {store.workingHours && <p className="mt-1 text-modi-gray-900">{store.workingHours}</p>}
        </div>

        {settings.showEnamad && (
          <div className="flex flex-col items-start gap-3">
            <h3 className="mb-1 text-sm font-bold text-[#2b2740]">نماد اعتماد</h3>
            <Image src="/img/enamad.png" alt="نماد اعتماد الکترونیکی" width={125} height={136} className="h-20 w-auto opacity-90" />
          </div>
        )}
      </div>

      {/* ---- mobile stack (below lg) ---- */}
      <div className="border-t border-modi-gray-500 px-5 pb-6 pt-6 lg:hidden">
        <div className="flex items-center gap-3">
          <Image
            src="/img/mobile-logo-footer.png"
            alt={store.name}
            width={250}
            height={143}
            className="h-10 w-auto shrink-0 opacity-90"
          />
          <h2 className="text-sm font-bold text-[#2b2740]">{settings.aboutTitle}</h2>
        </div>
        <p className="mt-3 leading-8 text-modi-gray-900">{settings.boilerplate}</p>

        <h3 className="mt-6 mb-2 text-xs font-bold text-modi-gray-900">لینک‌های پرکاربرد</h3>
        <nav className="overflow-hidden rounded-xl bg-modi-gray-300">
          {settings.quickLinks.map((l, i) => (
            <Link
              key={l.href + l.label}
              href={l.href}
              className={`flex items-center justify-between px-4 py-3 text-[#2b2740] transition active:bg-modi-purple-200 ${
                i > 0 ? "border-t border-modi-gray-500" : ""
              }`}
            >
              {l.label}
              <svg width="6" height="10" viewBox="0 0 7 11" aria-hidden className="opacity-50">
                <path d="M1 1l4.5 4.5L1 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Link>
          ))}
        </nav>

        <h3 className="mt-6 mb-2 text-xs font-bold text-modi-gray-900">پشتیبانی و اعتماد</h3>
        <div className="flex items-center justify-between rounded-xl bg-modi-gray-300 px-4 py-3">
          <a href={store.telegramUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-modi-purple-800">
            پشتیبانی تلگرام {store.telegram}
          </a>
          {settings.showEnamad && (
            <Image src="/img/enamad.png" alt="نماد اعتماد الکترونیکی" width={125} height={136} className="h-14 w-auto opacity-90" />
          )}
        </div>
      </div>

      <p className="bg-modi-gray-500 py-4 text-center text-xs text-modi-gray-900">
        {store.copyright} ·{" "}
        {new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date())}
      </p>
    </footer>
  );
}
