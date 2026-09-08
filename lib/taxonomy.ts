import { products, isListed, type Product } from "./products";

/**
 * The catalogue is sliced three ways, per the site spec:
 *   جنس (material)   — `Product.category`
 *   طرح (pattern)    — the "طرح" attribute
 *   کاربرد (usage)   — the "کاربرد" attribute
 * Pattern and usage attributes hold several "/"- or "،"-separated values.
 */

export type Dimension = "material" | "pattern" | "usage";

export const dimensionLabels: Record<Dimension, string> = {
  material: "جنس پارچه",
  pattern: "طرح پارچه",
  usage: "کاربرد پارچه",
};

export function attr(product: Product, label: string): string | undefined {
  return product.attributes.find((a) => a.label === label)?.value;
}

function splitMulti(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\/،,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function patternsOf(product: Product): string[] {
  return splitMulti(attr(product, "طرح"));
}

export function usagesOf(product: Product): string[] {
  return splitMulti(attr(product, "کاربرد"));
}

/** slug helpers — Persian stays in the slug (Next handles UTF-8 route segments). */
export const slugify = (s: string) => s.trim().replace(/\s+/g, "-");
export const unslug = (s: string) => decodeURIComponent(s).replace(/-/g, " ");

function tally(values: (p: Product) => string[]) {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const v of values(p)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export const materials = tally((p) => [p.category]);
export const patterns = tally(patternsOf);
export const usages = tally(usagesOf);

export function dimensionValues(dim: Dimension) {
  if (dim === "material") return materials;
  if (dim === "pattern") return patterns;
  return usages;
}

export function productMatches(product: Product, dim: Dimension, value: string) {
  if (dim === "material") return product.category === value;
  if (dim === "pattern") return patternsOf(product).includes(value);
  return usagesOf(product).includes(value);
}

/** Homepage "collections" carousel — an informal cut over the same catalogue. */
export const collections: string[] = [
  "کرپ حریر",
  "کتان گاباردین",
  "لینن ساده",
  "دانتل",
  "ابریشم",
  "تور",
  "مخمل",
  "سیلک طرح‌دار",
  "تافته",
  "نخی",
];

/**
 * Colour-variant grouping.
 *
 * The imported WooCommerce export has no product-linking data at all —
 * every row is a standalone "simple" product (`Type` column), and both
 * `Tags` and `Parent` are empty for all 392 rows. So there is nothing to
 * recover a real variant relationship from; the site's colourway grouping
 * has to be *inferred*.
 *
 * Same جنس/ایستایی/عرض/price narrows candidates to the same fabric batch,
 * but `طرح` turns out to be unusable for the final call: it's a messy
 * multi-tag soup (e.g. "سنتی/هندسی/زنجیری/کتیبه‌ای/گل‌دار") that's often
 * IDENTICAL across products that are actually different prints (a "کتیبه"
 * design and an unrelated "ساکورا" design can carry the exact same طرح
 * string), while genuine colourways of one print can differ by a tag or
 * two. So it's dropped from the signature and the real discriminator
 * becomes the product name: strip the material, price-list colour words,
 * and the filler word "طرح" from each name, and require the leftover
 * "design words" to overlap (or be empty on either side — a name that's
 * just "<fabric> <colour>" carries no extra design word to conflict with).
 */
function designSignature(p: Product): string {
  return [
    p.category,
    attr(p, "جنس") ?? "",
    attr(p, "ایستایی") ?? "",
    attr(p, "عرض") ?? "",
    p.price,
  ].join("|");
}

function tokenize(s: string): string[] {
  return s.split(/[\s‌]+/).filter(Boolean);
}

const NAME_FILLER_WORDS = new Set(["طرح", "طرح‌دار", "طرحدار"]);

function designWords(p: Product): Set<string> {
  const stop = new Set(NAME_FILLER_WORDS);
  for (const t of tokenize(p.category)) stop.add(t);
  for (const part of (attr(p, "جنس") ?? "").split("/"))
    for (const t of tokenize(part)) stop.add(t);
  for (const phrase of (attr(p, "رنگ‌ها") ?? "").split(/[،,]/))
    for (const t of tokenize(phrase)) stop.add(t);
  return new Set(tokenize(p.name).filter((t) => !stop.has(t)));
}

function sameDesign(a: Product, b: Product): boolean {
  const wa = designWords(a);
  const wb = designWords(b);
  if (wa.size === 0 || wb.size === 0) return true;
  // Majority overlap, not "any shared word": a single shared qualifier
  // (e.g. "ترک" in both "ترک ضخیم" and "ترک نازک" — thick vs. thin, a
  // real distinction, not a colour) shouldn't be enough to merge two
  // otherwise-different variants, but two names that mostly agree with
  // one extra/missing word (numbered variants, a finish-name swap) should
  // still match.
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size) > 0.5;
}

/** Other colourways of the exact same design — powers the رنگبندی strip. */
export function colorwaysOf(product: Product): Product[] {
  const sig = designSignature(product);
  return products.filter(
    (p) =>
      p.id !== product.id &&
      isListed(p) &&
      designSignature(p) === sig &&
      sameDesign(p, product),
  );
}

/**
 * Broader "you might also like" — same fabric family, but excluding the
 * exact colourways already shown in رنگبندی so the two rails don't just
 * repeat each other.
 */
export function relatedOf(
  product: Product,
  exclude: Product[] = [],
  limit = 10,
): Product[] {
  const skip = new Set([product.id, ...exclude.map((p) => p.id)]);
  return products
    .filter((p) => !skip.has(p.id) && isListed(p) && p.category === product.category)
    .slice(0, limit);
}
