import { notFound } from "next/navigation";
import { getProduct, isViewable } from "@/lib/products";
import { colorwaysOf, relatedOf } from "@/lib/taxonomy";
import { ensureHydrated } from "@/lib/productStore";
import { getSite } from "@/lib/siteStore";
import { answeredQuestionsFor, approvedReviewsFor } from "@/lib/orderStore";
import ProductDetail from "./ProductDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await ensureHydrated();
  const p = getProduct(slug);
  return { title: p ? p.name : "محصول" };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  await ensureHydrated();
  const product = getProduct(slug);
  // drafts are only visible to the admin's «مشاهده در سایت» (?preview=1)
  if (!product || (!isViewable(product) && !preview)) notFound();

  const [site, reviews, questions] = await Promise.all([getSite(), approvedReviewsFor(product.slug), answeredQuestionsFor(product.slug)]);
  const { catalogue } = site.settings;
  const variants = colorwaysOf(product).slice(0, catalogue.colorwayLimit);
  const related = relatedOf(product, variants, catalogue.relatedLimit);
  return (
    <ProductDetail
      product={product}
      variants={variants}
      related={related}
      showStock={catalogue.showStock}
      reviews={reviews.map((r) => ({ id: r.id, name: r.name, rating: r.rating, text: r.text, reply: r.reply, verified: r.verified, createdAt: r.createdAt }))}
      questions={questions.map((q) => ({ id: q.id, name: q.name, text: q.text, answer: q.answer ?? "" }))}
    />
  );
}
