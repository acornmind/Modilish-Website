"use client";

import { useEffect } from "react";

/**
 * "راهنمای خرید متراژ" — bottom sheet with typical fabric requirements per
 * garment, split by fabric width, so the shopper can pick a length before
 * hitting the minimum-order error. Figures are the usual tailoring rules of
 * thumb for a medium size and are labelled as approximate.
 */

const rows: { item: string; wide: string; narrow: string }[] = [
  { item: "شومیز / بلوز", wide: "۱٫۵", narrow: "۲" },
  { item: "مانتو کوتاه", wide: "۲ تا ۲٫۵", narrow: "۳" },
  { item: "مانتو بلند", wide: "۲٫۵ تا ۳", narrow: "۳٫۵ تا ۴" },
  { item: "پیراهن / سارافون", wide: "۲٫۵ تا ۳", narrow: "۳٫۵" },
  { item: "دامن", wide: "۱٫۲ تا ۱٫۵", narrow: "۲" },
  { item: "شلوار", wide: "۱٫۵", narrow: "۲٫۵" },
  { item: "کت", wide: "۱٫۵ تا ۲", narrow: "۲٫۵" },
  { item: "شال / روسری", wide: "۱ تا ۱٫۵", narrow: "۱٫۵" },
];

export default function SizeGuide({
  width,
  minOrder,
  onClose,
}: {
  width?: string;
  minOrder: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const isNarrow = !!width && /1[0-2]0|۱[۰-۲]۰/.test(width);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
      <div
        className="absolute inset-0 bg-[#3131315e] backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="relative z-10 max-h-[85vh] w-full max-w-[400px] overflow-y-auto rounded-t-3xl bg-white px-5 pb-6 pt-4 shadow-xl lg:max-w-md lg:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-modi-gray-500 lg:hidden" />
        <div className="mb-1 flex items-center justify-between">
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-modi-gray-500 text-gray-700"
          >
            ×
          </button>
          <h2 id="size-guide-title" className="text-sm font-bold">
            راهنمای خرید متراژ
          </h2>
        </div>
        <p className="mb-4 text-right text-[11px] leading-6 text-modi-gray-900">
          مقادیر تقریبی برای سایز متوسط. برای سایزهای بزرگ‌تر یا طرح‌های چاپی که
          باید هماهنگ شوند، ۲۰ تا ۳۰ سانتی‌متر بیشتر در نظر بگیرید.
        </p>

        <table className="w-full border-separate border-spacing-y-1 text-xs">
          <thead>
            <tr className="text-[11px] text-modi-gray-900">
              <th className="pb-1 text-right font-normal">لباس</th>
              <th
                className={`pb-1 font-normal ${!isNarrow ? "text-modi-purple-800" : ""}`}
              >
                عرض ۱۴۰–۱۵۰
              </th>
              <th
                className={`pb-1 font-normal ${isNarrow ? "text-modi-purple-800" : ""}`}
              >
                عرض ۱۰۰–۱۲۰
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.item} className="bg-[rgba(128,128,128,0.07)]">
                <td className="rounded-r-lg px-3 py-2 text-right font-bold text-[#2b2740]">
                  {r.item}
                </td>
                <td
                  className={`px-3 py-2 text-center ${!isNarrow ? "font-bold text-modi-purple-800" : "text-gray-700"}`}
                >
                  {r.wide} متر
                </td>
                <td
                  className={`rounded-l-lg px-3 py-2 text-center ${isNarrow ? "font-bold text-modi-purple-800" : "text-gray-700"}`}
                >
                  {r.narrow} متر
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 rounded-xl bg-modi-purple-200 px-3 py-2 text-right text-[11px] leading-6 text-modi-purple-800">
          {width ? `عرض این پارچه ${width} است. ` : ""}
          حداقل سفارش {minOrder.toLocaleString("fa-IR")} متر و افزایش‌ها ۱۰
          سانتی‌متری است.
        </p>
      </div>
    </div>
  );
}
