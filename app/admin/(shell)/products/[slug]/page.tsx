import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products";
import { ensureHydrated } from "@/lib/productStore";
import ProductEditor from "@/app/admin/_components/ProductEditor";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await ensureHydrated();
  const p = getProduct(decodeURIComponent(slug));
  return { title: p ? `${p.name}` : "محصول" };
}

export default async function AdminProductEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await ensureHydrated();
  const product = getProduct(decodeURIComponent(slug));
  if (!product) notFound();
  return <ProductEditor product={product} />;
}
