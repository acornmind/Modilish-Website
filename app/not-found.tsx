import Link from "next/link";

export const metadata = { title: "صفحه یافت نشد" };

export default function NotFound() {
  return (
    <main className="page-bg flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl font-bold text-modi-purple-500 shadow-md">
        !
      </span>
      <p className="mt-5 text-base font-bold">صفحه‌ای که دنبالش بودید پیدا نشد</p>
      <p className="mt-2 text-xs text-modi-gray-900">
        ممکن است آدرس اشتباه باشد یا این محصول دیگر موجود نباشد.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-modi-purple-800 px-6 text-sm text-white"
      >
        مشاهده فروشگاه
      </Link>
    </main>
  );
}
