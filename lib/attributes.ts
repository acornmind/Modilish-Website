// Attribute values + the admin's per-value metadata (§4.4) — browser-safe.
import { products } from "./products";
import { attr, dimensionValues, patternsOf, usagesOf, type Dimension } from "./taxonomy";
import type { AttributeMeta } from "./siteContent";

export type AttributeType = "material" | "detail" | "pattern" | "usage" | "stance" | "color" | "season";

export const attributeTypeLabels: Record<AttributeType, string> = {
  material: "جنس",
  detail: "جنس دقیق",
  pattern: "طرح",
  usage: "کاربرد",
  stance: "ایستایی",
  color: "رنگ",
  season: "زمان استفاده",
};

const split = (s?: string) => (s ? s.split(/[\/،,]/).map((x) => x.trim()).filter(Boolean) : []);

export function valuesOf(type: AttributeType, p: (typeof products)[number]): string[] {
  switch (type) {
    case "material":
      return [p.category];
    case "detail":
      return split(attr(p, "جنس"));
    case "pattern":
      return patternsOf(p);
    case "usage":
      return usagesOf(p);
    case "stance":
      return split(attr(p, "ایستایی"));
    case "color":
      return split(attr(p, "رنگ‌ها"));
    case "season":
      return split(attr(p, "زمان استفاده"));
  }
}

export function tally(type: AttributeType) {
  const counts = new Map<string, number>();
  for (const p of products) for (const v of valuesOf(type, p)) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

export const metaKey = (type: AttributeType, name: string) => `${type}:${name}`;

export const defaultMeta: AttributeMeta = { image: "", description: "", seoTitle: "", seoDescription: "", showInMenu: true, position: 0 };

export function metaFor(all: Record<string, AttributeMeta>, type: AttributeType, name: string): AttributeMeta {
  return { ...defaultMeta, ...(all[metaKey(type, name)] ?? {}) };
}

/** Menu values per dimension — admin order (position) first, then product count; hidden values dropped (§4.12). */
export function menuValuesFor(all: Record<string, AttributeMeta>): Record<Dimension, string[]> {
  const out = {} as Record<Dimension, string[]>;
  for (const dim of ["material", "pattern", "usage"] as Dimension[]) {
    const type: AttributeType = dim;
    out[dim] = dimensionValues(dim)
      .map((v, i) => ({ name: v.name, count: v.count, i, meta: metaFor(all, type, v.name) }))
      .filter((v) => v.meta.showInMenu)
      .sort((a, b) => (a.meta.position || 999) - (b.meta.position || 999) || a.i - b.i)
      .map((v) => v.name);
  }
  return out;
}
