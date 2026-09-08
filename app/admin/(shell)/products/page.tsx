import { products } from "@/lib/products";
import { ensureHydrated } from "@/lib/productStore";
import ProductsTable from "@/app/admin/_components/ProductsTable";

export const metadata = { title: "محصولات" };

// Real product list, editable inline (§4.3.1) — reads the same catalogue the
// storefront renders, so a price/stock edit here shows up there immediately.
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ stock?: string; filter?: string; q?: string }>;
}) {
  ensureHydrated();
  const { stock, filter, q } = await searchParams;
  const initial = stock === "low" ? "low" : (filter as "all" | "low" | "out" | "sale" | "draft" | "nophoto" | undefined);

  return <ProductsTable products={products} initialFilter={initial} initialQuery={q ?? ""} />;
}
