import { attr } from "./taxonomy";
import type { Product } from "./products";

/**
 * Turns a product's structured attributes into a short, readable Farsi
 * write-up for the "Description" tab — a few clear sentences (identity,
 * feel, specs, best uses) instead of the single dense run-on sentence the
 * catalogue's stored `description` field holds. Built entirely from real
 * attribute data, so it never invents anything about the product.
 */

const STANCE_COPY: Record<string, string> = {
  "لَخت و بدون آهار":
    "این پارچه افت و ریزش نرمی دارد و به‌آرامی روی بدن می‌نشیند.",
  "لخت و بدون آهار":
    "این پارچه افت و ریزش نرمی دارد و به‌آرامی روی بدن می‌نشیند.",
  "آهار متوسط":
    "ایستایی متعادلی دارد و فرم دوخت را به‌خوبی حفظ می‌کند.",
  "آهار دار":
    "ایستایی بالایی دارد و برای دوخت‌های فرم‌دار بسیار مناسب است.",
};

function stanceSentence(stance?: string): string | null {
  if (!stance) return null;
  return STANCE_COPY[stance] ?? `ایستایی این پارچه ${stance} است.`;
}

export function productParagraphs(product: Product): string[] {
  const material = attr(product, "جنس") ?? product.category;
  const pattern = attr(product, "طرح");
  const stance = attr(product, "ایستایی");
  const width = attr(product, "عرض");
  const colors = attr(product, "رنگ‌ها");
  const usage = attr(product, "کاربرد");
  const season = attr(product, "زمان استفاده");
  const hasPattern = !!pattern && !/بدون طرح/.test(pattern);

  const paragraphs: string[] = [];

  paragraphs.push(
    `«${product.name}» از جنس ${material} است` +
      (hasPattern ? `، با طرح ${pattern}` : "") +
      (colors ? `، در رنگ ${colors}` : "") +
      ".",
  );

  const stanceLine = stanceSentence(stance);
  const widthLine = width ? `عرض این پارچه ${width} است.` : null;
  if (stanceLine || widthLine) {
    paragraphs.push([stanceLine, widthLine].filter(Boolean).join(" "));
  }

  const usageLine = usage ? `گزینه‌ای مناسب برای دوخت ${usage}.` : null;
  const seasonLine = season ? `بهترین زمان استفاده از آن: ${season}.` : null;
  if (usageLine || seasonLine) {
    paragraphs.push([usageLine, seasonLine].filter(Boolean).join(" "));
  }

  paragraphs.push(
    "پیش از ثبت سفارش، راهنمای انتخاب متراژ را ببینید تا مقدار پارچه موردنیاز خود را به‌درستی محاسبه کنید.",
  );

  return paragraphs;
}
