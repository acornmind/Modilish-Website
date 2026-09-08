/**
 * Persian-aware text matching for search + keyword filters.
 *
 * Shoppers type with whatever keyboard they have: Arabic ي/ك instead of
 * Persian ی/ک, half-spaces (ZWNJ) or none between words, Persian or Latin
 * digits, stray diacritics. A raw `includes()` misses all of those, so both
 * sides are normalised first and the query is matched token-by-token in any
 * order ("حریر کرپ" finds "کرپ حریر").
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeFa(s: string): string {
  return s
    .replace(/[يى]/g, "ی") // ي ى → ی
    .replace(/ك/g, "ک") // ك → ک
    .replace(/ة/g, "ه") // ة → ه
    .replace(/[ً-ْٰ]/g, "") // tashkeel: لَخت → لخت
    .replace(/[‌​ ]/g, " ") // ZWNJ / ZWSP / NBSP → space
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** True when every token of `query` appears somewhere in `haystack`. */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeFa(query);
  if (!q) return false;
  const h = normalizeFa(haystack);
  return q.split(" ").every((t) => h.includes(t));
}
