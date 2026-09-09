import { getPage, getSite } from "@/lib/siteStore";
import ContactForm from "@/components/ContactForm";

export const metadata = { title: "تماس با ما" };

// Content from admin → صفحات → تماس با ما; the contact details themselves come
// from تنظیمات → فروشگاه so they're defined once (§4.8).
export default async function ContactPage() {
  const page = await getPage("contact");
  const { store } = (await getSite()).settings;
  if (!page || page.status !== "published") return <main className="min-h-[30vh] bg-white" />;

  const rows: { label: string; value: string; href?: string }[] = [
    { label: "تلگرام", value: store.telegram, href: store.telegramUrl },
    { label: "تلفن", value: store.phone, href: `tel:${store.phone}` },
    { label: "اینستاگرام", value: store.instagram ? `@${store.instagram}` : "", href: store.instagram ? `https://instagram.com/${store.instagram}` : undefined },
    { label: "ایمیل", value: store.email, href: store.email ? `mailto:${store.email}` : undefined },
    { label: "آدرس", value: store.address },
    { label: "ساعات کاری", value: store.workingHours },
  ].filter((r) => r.value);

  return (
    <main className="bg-white pb-10">
      <div className="modi-container px-4 pt-6 text-right lg:px-8 lg:pt-14">
        <h1 className="text-xl font-bold text-modi-purple-800 lg:text-3xl">{page.title}</h1>
        <div className="mt-4 space-y-3">
          {page.body.map((p, i) => (
            <p key={i} className="text-sm leading-8 text-[#2b2740] lg:text-base lg:leading-9">
              {p}
            </p>
          ))}
        </div>

        {page.showContact && (
          <dl className="mt-6 overflow-hidden rounded-2xl bg-modi-gray-300 text-sm lg:max-w-xl">
            {rows.map((r, i) => (
              <div key={r.label} className={`flex items-start justify-between gap-4 px-4 py-3 ${i > 0 ? "border-t border-modi-gray-500" : ""}`}>
                <dt className="shrink-0 text-modi-gray-900">{r.label}</dt>
                <dd className="text-left tabular-nums">
                  {r.href ? (
                    <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="font-bold text-modi-purple-800">
                      {r.value}
                    </a>
                  ) : (
                    r.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {page.showContact && <ContactForm />}
      </div>
    </main>
  );
}
