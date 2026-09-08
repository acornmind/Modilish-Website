import { catalog } from "./catalog";

export type Product = {
  id: number;
  slug: string;
  name: string;
  /** regular price per unit, in Toman */
  price: number;
  /** sale price per unit, in Toman (0 = no sale) */
  salePrice: number;
  /** stock available, in meters */
  meters: number;
  /** minimum orderable length, in meters */
  limit: number;
  /** unit label shown to the user */
  unit: "متر" | "عدد";
  image: string;
  category: string;
  rating: number;
  attributes: { label: string; value: string }[];
  description: string;
  /** منتشرشده (default) / پیش‌نویس / پنهان — hidden is reachable by URL but not listed (§4.3.2) */
  status?: "published" | "draft" | "hidden";
  /** Aparat / YouTube / direct .mp4 link behind «ویدیو معرفی پارچه» */
  videoUrl?: string;
};

/** Full catalogue, imported from the auto-generated WooCommerce export. */
export const products: Product[] = catalog;

/** Products that appear in listings, rows and search. */
export function isListed(p: Product) {
  return !p.status || p.status === "published";
}

/** Products a customer can open by URL (drafts are admin-only). */
export function isViewable(p: Product) {
  return p.status !== "draft";
}

/** Spec-table row order — §4.3.2 «جنس، طرح، ایستایی، عرض، رنگ‌ها، کاربرد، زمان استفاده». */
export const attributeOrder = ["جنس", "طرح", "ایستایی", "عرض", "رنگ‌ها", "کاربرد", "زمان استفاده"] as const;

/** Fabric families, ordered by how many products fall in each. */
export const categories = [
  "همه",
  "کتان",
  "کرپ",
  "لینن",
  "نخی",
  "تور",
  "سیلک",
  "دانتل",
  "ابریشم",
  "مخمل",
  "باتیک",
  "تافته",
  "جوت",
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function toman(n: number) {
  return n.toLocaleString("fa-IR") + " تومان";
}
