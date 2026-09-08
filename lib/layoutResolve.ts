// Server-only: turns a Layout's sections into the concrete data the
// storefront's SectionRenderer needs (products for rows, photos for circles,
// posts for the magazine teaser). Sections whose source is empty are dropped
// here, exactly as §4.5 says ("skipped by the renderer").
import { products, isListed, type Product } from "./products";
import { patternsOf, slugify, usagesOf } from "./taxonomy";
import { matchesQuery } from "./search";
import { haystack, categoryImage } from "./homeCategories";
import { ensureHydrated } from "./productStore";
import { getPublishedPosts } from "./siteStore";
import type { CircleItem, Layout, RowSource, Section } from "./siteContent";
import type { Post } from "./siteContent";

export type ResolvedCircle = { label: string; href: string; img: string };

export type ResolvedSection =
  | { id: string; type: "hero"; device: Section["device"]; slides: Extract<Section, { type: "hero" }>["props"]["slides"]; intervalMs: number }
  | { id: string; type: "circles"; device: Section["device"]; items: ResolvedCircle[] }
  | { id: string; type: "productRow"; device: Section["device"]; title: string; href: string; products: Product[] }
  | { id: string; type: "infoCard"; device: Section["device"]; title: string; text: string; href: string }
  | { id: string; type: "banner"; device: Section["device"]; img: string; href: string; alt: string }
  | { id: string; type: "magazine"; device: Section["device"]; title: string; linkText: string; posts: Post[] }
  | { id: string; type: "brand"; device: Section["device"]; title: string; text: string; image: string; href: string }
  | { id: string; type: "countdown"; device: Section["device"]; title: string; text: string; weekday: number }
  | { id: string; type: "richText"; device: Section["device"]; title: string; text: string };

export function circleHref(item: CircleItem): string {
  switch (item.kind) {
    case "family":
      return `/materials/${encodeURIComponent(slugify(item.value))}`;
    case "pattern":
      return `/shop?pattern=${encodeURIComponent(slugify(item.value))}`;
    case "query":
      return `/shop?q=${encodeURIComponent(item.value)}`;
    default:
      return item.value;
  }
}

export function circleCount(item: CircleItem): number {
  ensureHydrated();
  switch (item.kind) {
    case "family":
      return products.filter((p) => p.category === item.value).length;
    case "pattern":
      return products.filter((p) => patternsOf(p).includes(item.value)).length;
    case "query":
      return products.filter((p) => matchesQuery(haystack(p), item.value)).length;
    default:
      return 1;
  }
}

export function resolveRow(source: RowSource, limit: number, hideOutOfStock: boolean): Product[] {
  ensureHydrated();
  let list: Product[];
  switch (source.kind) {
    case "material":
      list = products.filter((p) => p.category === source.value);
      break;
    case "pattern":
      list = products.filter((p) => patternsOf(p).includes(source.value));
      break;
    case "usage":
      list = products.filter((p) => usagesOf(p).includes(source.value));
      break;
    case "query":
      list = products.filter((p) => matchesQuery(haystack(p), source.value));
      break;
    case "newest":
      list = [...products].sort((a, b) => b.id - a.id);
      break;
    case "onSale":
      list = products.filter((p) => p.salePrice > 0);
      break;
    case "manual":
      list = source.skus.map((s) => products.find((p) => p.slug === s)).filter((p): p is Product => !!p);
      break;
  }
  list = list.filter(isListed);
  if (hideOutOfStock) list = list.filter((p) => p.meters > 0);
  return list.slice(0, Math.max(1, limit));
}

export function resolveLayout(layout: Layout): ResolvedSection[] {
  ensureHydrated();
  const out: ResolvedSection[] = [];
  for (const s of layout.sections) {
    if (!s.visible) continue;
    const common = { id: s.id, device: s.device };
    switch (s.type) {
      case "hero":
        if (s.props.slides.length === 0) continue;
        out.push({ ...common, type: "hero", slides: s.props.slides, intervalMs: s.props.intervalMs });
        break;
      case "circles": {
        const items = s.props.items
          .filter((c) => circleCount(c) > 0)
          .map((c) => ({ label: c.label, href: circleHref(c), img: c.img || categoryImage(c.value) }));
        if (items.length === 0) continue;
        out.push({ ...common, type: "circles", items });
        break;
      }
      case "productRow": {
        const list = resolveRow(s.props.source, s.props.limit, s.props.hideOutOfStock);
        if (list.length === 0) continue;
        out.push({ ...common, type: "productRow", title: s.props.title, href: s.props.href, products: list });
        break;
      }
      case "infoCard":
        out.push({ ...common, type: "infoCard", ...s.props });
        break;
      case "banner":
        if (!s.props.img) continue;
        out.push({ ...common, type: "banner", ...s.props });
        break;
      case "magazine": {
        const posts = getPublishedPosts().slice(0, Math.max(1, s.props.limit));
        if (posts.length === 0) continue;
        out.push({ ...common, type: "magazine", title: s.props.title, linkText: s.props.linkText, posts });
        break;
      }
      case "brand":
        out.push({ ...common, type: "brand", ...s.props });
        break;
      case "countdown":
        out.push({ ...common, type: "countdown", ...s.props });
        break;
      case "richText":
        if (!s.props.text.trim()) continue;
        out.push({ ...common, type: "richText", ...s.props });
        break;
    }
  }
  return out;
}

/** Which sections of a draft would render empty — shown in the builder as «فعلاً محتوایی ندارد». */
export function emptySectionIds(layout: Layout): string[] {
  const rendered = new Set(resolveLayout({ sections: layout.sections.map((s) => ({ ...s, visible: true })) }).map((s) => s.id));
  return layout.sections.filter((s) => !rendered.has(s.id)).map((s) => s.id);
}
