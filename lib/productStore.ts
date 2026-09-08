// Server-only persistence for admin edits to the catalogue.
//
// There is no database yet (docs/admin-spec.md §6 — Postgres/Prisma is
// planned, not built). Until then this is the bridge that makes the admin
// actually change what the storefront shows: it mutates the shared
// `products` array in place (every server-rendered page reads that same
// module instance) and mirrors the change to JSON files so it survives a
// dev-server restart.
//
// Deliberately kept out of lib/products.ts itself — that module is imported
// by client components (lib/cart.tsx), and `fs` cannot ship in a browser
// bundle. Only import this file from server-only code (Server Actions,
// Server Components) — never from a "use client" file.
import fs from "node:fs";
import path from "node:path";
import { products, type Product } from "./products";
import { audit } from "./siteStore";

const OVERRIDES_FILE = path.join(process.cwd(), "data", "product-overrides.json");
const NEW_PRODUCTS_FILE = path.join(process.cwd(), "data", "new-products.json");
const DELETED_FILE = path.join(process.cwd(), "data", "deleted-products.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "img", "uploads");

export type ProductPatch = Partial<Omit<Product, "id" | "slug">>;

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let hydrated = false;

/** Applies persisted new products, deletions and overrides onto the live `products` array. Idempotent. */
export function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;

  const created = readJson<Product[]>(NEW_PRODUCTS_FILE, []);
  for (const product of created) {
    if (!products.some((p) => p.slug === product.slug)) products.push(product);
  }

  const deleted = new Set(readJson<string[]>(DELETED_FILE, []));
  for (let i = products.length - 1; i >= 0; i--) {
    if (deleted.has(products[i].slug)) products.splice(i, 1);
  }

  const overrides = readJson<Record<string, ProductPatch>>(OVERRIDES_FILE, {});
  for (const product of products) {
    const patch = overrides[product.slug];
    if (patch) Object.assign(product, patch);
  }
}

export function updateProduct(slug: string, patch: ProductPatch) {
  ensureHydrated();
  const product = products.find((p) => p.slug === slug);
  if (!product) throw new Error(`محصول با کد ${slug} یافت نشد`);

  const before = { ...product };
  Object.assign(product, patch);

  const overrides = readJson<Record<string, ProductPatch>>(OVERRIDES_FILE, {});
  overrides[slug] = { ...overrides[slug], ...patch };
  writeJson(OVERRIDES_FILE, overrides);

  const changed = Object.keys(patch)
    .filter((k) => JSON.stringify(before[k as keyof Product]) !== JSON.stringify(product[k as keyof Product]))
    .join("، ");
  audit({ action: "ویرایش محصول", entity: "product", entityId: slug, summary: changed || "بدون تغییر" });
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

export function createProduct(input: NewProductInput, template?: Partial<Product>): Product {
  ensureHydrated();
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

  products.push(product);

  const created = readJson<Product[]>(NEW_PRODUCTS_FILE, []);
  created.push(product);
  writeJson(NEW_PRODUCTS_FILE, created);

  // a re-created slug must not stay on the deleted list
  const deleted = readJson<string[]>(DELETED_FILE, []).filter((s) => s !== input.slug);
  writeJson(DELETED_FILE, deleted);

  audit({ action: "ایجاد محصول", entity: "product", entityId: product.slug, summary: product.name });
  return product;
}

export function duplicateProduct(slug: string): Product {
  ensureHydrated();
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

export function deleteProduct(slug: string) {
  ensureHydrated();
  const i = products.findIndex((p) => p.slug === slug);
  if (i < 0) throw new Error("محصول یافت نشد");
  const [removed] = products.splice(i, 1);

  const created = readJson<Product[]>(NEW_PRODUCTS_FILE, []);
  const wasCreated = created.some((p) => p.slug === slug);
  if (wasCreated) {
    writeJson(NEW_PRODUCTS_FILE, created.filter((p) => p.slug !== slug));
  } else {
    const deleted = readJson<string[]>(DELETED_FILE, []);
    if (!deleted.includes(slug)) writeJson(DELETED_FILE, [...deleted, slug]);
  }
  const overrides = readJson<Record<string, ProductPatch>>(OVERRIDES_FILE, {});
  delete overrides[slug];
  writeJson(OVERRIDES_FILE, overrides);

  audit({ action: "حذف محصول", entity: "product", entityId: slug, summary: removed.name });
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
export function renameAttributeValue(type: AttributeType, from: string, to: string) {
  ensureHydrated();
  const target = to.trim();
  if (!target) throw new Error("نام جدید خالی است");
  const overrides = readJson<Record<string, ProductPatch>>(OVERRIDES_FILE, {});
  let touched = 0;
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
      overrides[p.slug] = { ...overrides[p.slug], ...patch };
      touched++;
    }
  }
  writeJson(OVERRIDES_FILE, overrides);
  audit({ action: "تغییر نام ویژگی", entity: "attribute", entityId: `${type}:${from}`, summary: `→ ${target} · ${touched} محصول` });
  return touched;
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

export function importProducts(rows: ImportRow[]) {
  ensureHydrated();
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
        updateProduct(r.code, {
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
        createProduct(
          { name: r.name, slug: r.code, unit: r.unit, category: r.material, price: r.price, meters: r.stock },
          { attributes, salePrice: r.salePrice ?? 0, limit: r.minOrder, image: r.image || undefined, description: r.description || undefined },
        );
        created++;
      }
    } catch (e) {
      errors.push({ code: r.code, message: e instanceof Error ? e.message : "خطا" });
    }
  }
  audit({ action: "درون‌ریزی محصولات", entity: "product", entityId: "import", summary: `${created} جدید، ${updated} به‌روزرسانی، ${errors.length} خطا` });
  return { created, updated, errors };
}

/* ---------------- media library — §4.13 ---------------- */

export type MediaItem = { url: string; name: string; bytes: number; usedBy: number; folder: "products" | "uploads" | "site" };

export function listMedia(): MediaItem[] {
  ensureHydrated();
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
  audit({ action: "بارگذاری تصویر", entity: "media", entityId: name, summary: `${Math.round(file.size / 1024)} KB` });
  return `/img/uploads/${name}`;
}

export function deleteUpload(url: string) {
  if (!url.startsWith("/img/uploads/")) throw new Error("فقط فایل‌های بارگذاری‌شده قابل حذف هستند");
  ensureHydrated();
  if (products.some((p) => p.image === url)) throw new Error("این تصویر روی یک محصول استفاده شده است");
  fs.rmSync(path.join(process.cwd(), "public", url), { force: true });
  audit({ action: "حذف تصویر", entity: "media", entityId: url, summary: "" });
}
