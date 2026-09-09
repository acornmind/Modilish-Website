// Server-only persistence for the catalogue.
//
// Every server-rendered page and the client bundle read the shared `products`
// array from lib/products.ts — it starts out as the static WooCommerce export
// so client components always have something to render. On the server,
// ensureHydrated() syncs that array with the products table once per request,
// and every write goes to Supabase first and then patches the array in place
// so the rest of the request sees it.
//
// Deliberately kept out of lib/products.ts itself — that module is imported
// by client components (lib/cart.tsx), and the service-role client cannot
// ship in a browser bundle. Only import this file from server-only code
// (Server Actions, Server Components) — never from a "use client" file.
//
// The media library is the one part that still uses the filesystem
// (public/img); uploads will move to Supabase Storage later.
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { products, type Product } from "./products";
import { audit } from "./siteStore";
import { check, supabaseAdmin, unwrap } from "./supabase/server";

const UPLOADS_DIR = path.join(process.cwd(), "public", "img", "uploads");
const now = () => new Date().toISOString();

export type ProductPatch = Partial<Omit<Product, "id" | "slug">>;

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  price: number;
  sale_price: number;
  meters: number | string;
  limit_meters: number | string;
  unit: Product["unit"];
  image: string;
  category: string;
  rating: number | string;
  attributes: Product["attributes"] | null;
  description: string | null;
  status: NonNullable<Product["status"]>;
  video_url: string | null;
};

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    price: r.price,
    salePrice: r.sale_price,
    meters: Number(r.meters),
    limit: Number(r.limit_meters),
    unit: r.unit,
    image: r.image,
    category: r.category,
    rating: Number(r.rating),
    attributes: r.attributes ?? [],
    description: r.description ?? "",
    status: r.status,
    // "" rather than undefined so the editor's empty field compares equal and isn't reported as a change
    videoUrl: r.video_url ?? "",
  };
}

function productToRow(p: Product) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    sale_price: p.salePrice,
    meters: p.meters,
    limit_meters: p.limit,
    unit: p.unit,
    image: p.image,
    category: p.category,
    rating: p.rating,
    attributes: p.attributes,
    description: p.description,
    status: p.status ?? "published",
    video_url: p.videoUrl ?? "",
    updated_at: now(),
  };
}

const columnOf: Record<keyof ProductPatch, string> = {
  name: "name",
  price: "price",
  salePrice: "sale_price",
  meters: "meters",
  limit: "limit_meters",
  unit: "unit",
  image: "image",
  category: "category",
  rating: "rating",
  attributes: "attributes",
  description: "description",
  status: "status",
  videoUrl: "video_url",
};

function patchToRow(patch: ProductPatch) {
  const row: Record<string, unknown> = { updated_at: now() };
  for (const [k, v] of Object.entries(patch) as [keyof ProductPatch, unknown][]) {
    if (v === undefined) continue;
    row[columnOf[k]] = k === "videoUrl" ? (v ?? "") : v;
  }
  return row;
}

/**
 * Syncs the shared `products` array with the products table: existing objects
 * are patched in place (other modules hold references to them), new ones are
 * appended and deleted ones removed. Memoised per request.
 */
export const ensureHydrated = cache(async () => {
  const rows = unwrap<ProductRow[]>(await supabaseAdmin().from("products").select("*").order("id"));
  const fresh = new Map(rows.map((r) => [r.slug, rowToProduct(r)]));
  for (let i = products.length - 1; i >= 0; i--) {
    const next = fresh.get(products[i].slug);
    if (!next) {
      products.splice(i, 1);
      continue;
    }
    Object.assign(products[i], next);
    fresh.delete(products[i].slug);
  }
  for (const p of fresh.values()) products.push(p);
});

export async function updateProduct(slug: string, patch: ProductPatch) {
  await ensureHydrated();
  const product = products.find((p) => p.slug === slug);
  if (!product) throw new Error(`محصول با کد ${slug} یافت نشد`);

  const before = { ...product };
  check(await supabaseAdmin().from("products").update(patchToRow(patch)).eq("slug", slug));
  Object.assign(product, patch);

  const changed = Object.keys(patch)
    .filter((k) => JSON.stringify(before[k as keyof Product]) !== JSON.stringify(product[k as keyof Product]))
    .join("، ");
  await audit({ action: "ویرایش محصول", entity: "product", entityId: slug, summary: changed || "بدون تغییر" });
  return product;
}

export type NewProductInput = {
  name: string;
  slug: string;
  unit: "متر" | "عدد";
  category: string;
  price: number;
  meters: number;
};

export async function createProduct(input: NewProductInput, template?: Partial<Product>): Promise<Product> {
  await ensureHydrated();
  if (!/^[\w؀-ۿ-]+$/.test(input.slug)) throw new Error("کد محصول فقط می‌تواند حرف، عدد و خط تیره باشد");
  if (products.some((p) => p.slug === input.slug)) {
    throw new Error(`کد محصول «${input.slug}» تکراری است`);
  }

  const product: Product = {
    id: Math.max(0, ...products.map((p) => p.id)) + 1,
    slug: input.slug,
    name: input.name,
    price: input.price,
    salePrice: template?.salePrice ?? 0,
    meters: input.meters,
    limit: template?.limit ?? (input.unit === "متر" ? 0.5 : 1),
    unit: input.unit,
    image: template?.image || "/img/box.png",
    category: input.category,
    rating: 4.5,
    attributes: template?.attributes ?? [{ label: "جنس", value: input.category }],
    description: template?.description ?? `پارچه ${input.name} از جنس ${input.category}.`,
  };

  check(await supabaseAdmin().from("products").insert(productToRow(product)));
  products.push(product);

  await audit({ action: "ایجاد محصول", entity: "product", entityId: product.slug, summary: product.name });
  return product;
}

export async function duplicateProduct(slug: string): Promise<Product> {
  await ensureHydrated();
  const source = products.find((p) => p.slug === slug);
  if (!source) throw new Error("محصول یافت نشد");
  let n = 1;
  let newSlug = `${slug}-copy`;
  while (products.some((p) => p.slug === newSlug)) newSlug = `${slug}-copy${++n}`;
  return createProduct(
    { name: `${source.name} (کپی)`, slug: newSlug, unit: source.unit, category: source.category, price: source.price, meters: source.meters },
    source,
  );
}

export async function deleteProduct(slug: string) {
  await ensureHydrated();
  const i = products.findIndex((p) => p.slug === slug);
  if (i < 0) throw new Error("محصول یافت نشد");
  check(await supabaseAdmin().from("products").delete().eq("slug", slug));
  const [removed] = products.splice(i, 1);
  await audit({ action: "حذف محصول", entity: "product", entityId: slug, summary: removed.name });
}

/* ---------------- attributes — §4.4 rename / merge ---------------- */

export type AttributeType = "material" | "detail" | "pattern" | "usage" | "stance" | "color" | "season";

const attrLabel: Record<Exclude<AttributeType, "material">, string> = {
  detail: "جنس",
  pattern: "طرح",
  usage: "کاربرد",
  stance: "ایستایی",
  color: "رنگ‌ها",
  season: "زمان استفاده",
};

/** Renames (or, when `to` already exists, merges into) an attribute value on every product that carries it. */
export async function renameAttributeValue(type: AttributeType, from: string, to: string) {
  await ensureHydrated();
  const target = to.trim();
  if (!target) throw new Error("نام جدید خالی است");
  const touched: Product[] = [];
  for (const p of products) {
    let patch: ProductPatch | null = null;
    if (type === "material") {
      if (p.category === from) patch = { category: target };
    } else {
      const label = attrLabel[type];
      const attrs = p.attributes.map((a) => {
        if (a.label !== label) return a;
        const parts = a.value.split(/(\/|،|,)/); // keep separators
        let changed = false;
        const next = parts
          .map((part) => {
            if (part.trim() === from) {
              changed = true;
              return part.replace(from, target);
            }
            return part;
          })
          .join("");
        if (!changed) return a;
        // drop duplicates created by a merge ("کرپ، کرپ")
        const seen = new Set<string>();
        const dedup = next
          .split(/[\/،,]/)
          .map((s) => s.trim())
          .filter((s) => s && !seen.has(s) && seen.add(s))
          .join("، ");
        return { label: a.label, value: dedup };
      });
      if (JSON.stringify(attrs) !== JSON.stringify(p.attributes)) patch = { attributes: attrs };
    }
    if (patch) {
      Object.assign(p, patch);
      touched.push(p);
    }
  }
  if (touched.length > 0) check(await supabaseAdmin().from("products").upsert(touched.map(productToRow)));
  await audit({ action: "تغییر نام ویژگی", entity: "attribute", entityId: `${type}:${from}`, summary: `→ ${target} · ${touched.length} محصول` });
  return touched.length;
}

/* ---------------- bulk import — §4.3.4 ---------------- */

export type ImportRow = {
  code: string;
  name: string;
  material: string;
  detail?: string;
  patterns?: string;
  stance?: string;
  width?: string;
  colors?: string;
  usages?: string;
  seasons?: string;
  price: number;
  salePrice?: number;
  stock: number;
  minOrder?: number;
  unit: "متر" | "عدد";
  description?: string;
  image?: string;
};

export async function importProducts(rows: ImportRow[]) {
  await ensureHydrated();
  let created = 0;
  let updated = 0;
  const errors: { code: string; message: string }[] = [];
  for (const r of rows) {
    try {
      const attributes = [
        { label: "جنس", value: r.detail || r.material },
        { label: "طرح", value: r.patterns ?? "" },
        { label: "ایستایی", value: r.stance ?? "" },
        { label: "عرض", value: r.width ?? "" },
        { label: "رنگ‌ها", value: r.colors ?? "" },
        { label: "کاربرد", value: r.usages ?? "" },
        { label: "زمان استفاده", value: r.seasons ?? "" },
      ].filter((a) => a.value.trim());
      const existing = products.find((p) => p.slug === r.code);
      if (existing) {
        await updateProduct(r.code, {
          name: r.name,
          category: r.material,
          price: r.price,
          salePrice: r.salePrice ?? existing.salePrice,
          meters: r.stock,
          limit: r.minOrder ?? existing.limit,
          unit: r.unit,
          attributes,
          ...(r.description ? { description: r.description } : {}),
          ...(r.image ? { image: r.image } : {}),
        });
        updated++;
      } else {
        await createProduct(
          { name: r.name, slug: r.code, unit: r.unit, category: r.material, price: r.price, meters: r.stock },
          { attributes, salePrice: r.salePrice ?? 0, limit: r.minOrder, image: r.image || undefined, description: r.description || undefined },
        );
        created++;
      }
    } catch (e) {
      errors.push({ code: r.code, message: e instanceof Error ? e.message : "خطا" });
    }
  }
  await audit({ action: "درون‌ریزی محصولات", entity: "product", entityId: "import", summary: `${created} جدید، ${updated} به‌روزرسانی، ${errors.length} خطا` });
  return { created, updated, errors };
}

/* ---------------- media library — §4.13 (still filesystem-based) ---------------- */

export type MediaItem = { url: string; name: string; bytes: number; usedBy: number; folder: "products" | "uploads" | "site" };

export async function listMedia(): Promise<MediaItem[]> {
  await ensureHydrated();
  const usage = new Map<string, number>();
  for (const p of products) usage.set(p.image, (usage.get(p.image) ?? 0) + 1);

  const read = (dir: string, urlBase: string, folder: MediaItem["folder"]) => {
    let names: string[] = [];
    try {
      names = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|gif|svg)$/i.test(f));
    } catch {
      return [] as MediaItem[];
    }
    return names.map((name) => {
      const url = `${urlBase}/${name}`;
      let bytes = 0;
      try {
        bytes = fs.statSync(path.join(dir, name)).size;
      } catch {}
      return { url, name, bytes, usedBy: usage.get(url) ?? 0, folder };
    });
  };

  const pub = path.join(process.cwd(), "public", "img");
  return [
    ...read(UPLOADS_DIR, "/img/uploads", "uploads").sort((a, b) => (a.name < b.name ? 1 : -1)),
    ...read(path.join(pub, "products"), "/img/products", "products"),
    ...read(pub, "/img", "site").filter((m) => !m.name.endsWith(".svg")),
  ];
}

export async function saveUpload(file: File): Promise<string> {
  if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) throw new Error("فقط تصویر JPG، PNG، WebP یا GIF مجاز است");
  if (file.size > 8 * 1024 * 1024) throw new Error("حجم تصویر باید کمتر از ۸ مگابایت باشد");
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace("jpeg", "jpg");
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w؀-ۿ-]+/g, "-").slice(0, 40) || "image";
  const name = `${Date.now()}-${base}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
  await audit({ action: "بارگذاری تصویر", entity: "media", entityId: name, summary: `${Math.round(file.size / 1024)} KB` });
  return `/img/uploads/${name}`;
}

export async function deleteUpload(url: string) {
  if (!url.startsWith("/img/uploads/")) throw new Error("فقط فایل‌های بارگذاری‌شده قابل حذف هستند");
  await ensureHydrated();
  if (products.some((p) => p.image === url)) throw new Error("این تصویر روی یک محصول استفاده شده است");
  fs.rmSync(path.join(process.cwd(), "public", url), { force: true });
  await audit({ action: "حذف تصویر", entity: "media", entityId: url, summary: "" });
}
