import { products } from "./products";
import { patternsOf } from "./taxonomy";
import { matchesQuery } from "./search";

// The home circle list itself now lives in the published home layout
// (lib/siteContent.ts → admin → صفحه اصلی); these helpers stay shared with
// the shop/search pages and the layout resolver.

/** Text a product is searched against for the `q` filter + home circles. */
export function haystack(p: (typeof products)[number]): string {
  return [p.name, p.category, ...patternsOf(p)].join(" ");
}

/** A representative photo for a home circle — first product that matches. */
export function categoryImage(query: string): string {
  const hit =
    products.find((p) => p.category === query) ??
    products.find((p) => matchesQuery(haystack(p), query));
  if (hit) return hit.image;
  let h = 0;
  for (let i = 0; i < query.length; i++) h = (h * 31 + query.charCodeAt(i)) >>> 0;
  return products[h % products.length]?.image ?? "/img/box.png";
}
