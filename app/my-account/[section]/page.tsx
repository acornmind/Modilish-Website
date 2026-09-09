import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/lib/content";

const sections: Record<string, { title: string; soon?: boolean; blurb: string }> = {
  wallet: {
    title: "کیف پول من",
    soon: true,
    blurb: "شارژ کیف پول و پرداخت از موجودی به‌زودی فعال می‌شود.",
  },
  messages: {
    title: "پیام‌ها",
    soon: true,
    blurb: "پیام‌های مربوط به سفارش‌ها اینجا نمایش داده می‌شود. فعلاً از پشتیبانی تلگرام استفاده کنید.",
  },
  survey: {
    title: "نظرسنجی",
    soon: true,
    blurb: "نظرسنجی کیفیت پارچه و ارسال پس از تحویل سفارش فعال می‌شود.",
  },
  "account-details": {
    title: "اطلاعات کاربری",
    blurb: "شماره موبایل شما هنگام خرید تایید می‌شود و نیازی به ساخت حساب جداگانه نیست.",
  },
  logout: {
    title: "خروج از حساب",
    blurb: "شما به‌عنوان مهمان در حال مشاهده سایت هستید؛ حسابی برای خروج وجود ندارد.",
  },
};

export default async function AccountSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const s = sections[section];
  if (!s) notFound();

  return (
    <div className="py-4 text-right">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">{s.title}</h2>
        {s.soon && (
          <span className="rounded-full bg-modi-purple-200 px-2 py-0.5 text-[11px] text-modi-purple-800">
            به‌زودی
          </span>
        )}
      </div>
      <p className="mt-3 text-xs leading-6 text-modi-gray-900">{s.blurb}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {section === "messages" && (
          <a
            href={brand.telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-lg bg-modi-purple-800 px-4 text-xs text-white"
          >
            پشتیبانی تلگرام
          </a>
        )}
        <Link
          href={section === "logout" ? "/" : "/shop"}
          className="inline-flex h-9 items-center rounded-lg bg-modi-purple-200 px-4 text-xs text-modi-purple-800"
        >
          {section === "logout" ? "بازگشت به خانه" : "ادامه خرید"}
        </Link>
      </div>
    </div>
  );
}
