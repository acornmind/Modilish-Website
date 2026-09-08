"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";
import ProductCarousel from "@/components/ProductCarousel";
import ColorwayStrip from "@/components/ColorwayStrip";
import SizeGuide from "@/components/SizeGuide";
import WishlistButton from "@/components/WishlistButton";
import UpSelect from "@/components/UpSelect";
import { useCart, useStrings } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { attr, slugify } from "@/lib/taxonomy";
import { productParagraphs } from "@/lib/describe";
import { toman, type Product } from "@/lib/products";
import { getCheckout } from "@/lib/checkout";
import { submitQuestionAction, submitReviewAction } from "@/lib/orderActions";

const METERS = Array.from({ length: 11 }, (_, i) => i); // 0..10
const CM = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

type Tab = "specs" | "desc" | "reviews";

export type PublicReview = { id: string; name: string; rating: number; text: string; reply?: string; verified: boolean; createdAt: string };

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function ProductDetail({
  product,
  variants,
  related,
  showStock = true,
  reviews = [],
  questions = [],
}: {
  product: Product;
  variants: Product[];
  related: Product[];
  /** admin → تنظیمات → کاتالوگ: show remaining stock to customers */
  showStock?: boolean;
  /** approved reviews (admin → دیدگاه‌ها) */
  reviews?: PublicReview[];
  /** answered questions (admin → دیدگاه‌ها → پرسش‌ها) */
  questions?: { id: string; name: string; text: string; answer: string }[];
}) {
  const { add, priceOf } = useCart();
  const t = useStrings();
  const tabs: { key: Tab; label: string }[] = [
    { key: "specs", label: t("specsTab", "مشخصات") },
    { key: "desc", label: t("descTab", "توضیحات") },
    { key: "reviews", label: `${t("reviewsTab", "دیدگاه‌ها")} (${fa(reviews.length)})` },
  ];

  const usesMeters = product.unit === "متر";

  const [meter, setMeter] = useState(Math.max(1, Math.ceil(product.limit)));
  const [centimeter, setCentimeter] = useState(0);
  const [tab, setTab] = useState<Tab>("specs");
  const [guideOpen, setGuideOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const order = usesMeters ? meter + centimeter / 100 : meter;

  // discount rules from admin → بازاریابی: unit price can depend on quantity (volume tiers)
  const price = priceOf(product, order);
  const onSale = price.unit < price.list;
  const unitPrice = price.unit;

  const error = useMemo(() => {
    if (order > product.meters)
      return t("stockError", "فقط %s از این پارچه موجود است.", `${fa(product.meters)} ${product.unit}`);
    if (order < product.limit)
      return t("minOrderError", "حداقل متراژ قابل سفارش %s متر است.", fa(product.limit));
    return "";
  }, [order, product.meters, product.limit, product.unit, t]);

  const total = Math.round(unitPrice * order);

  const width = attr(product, "عرض");
  const material = attr(product, "جنس") ?? product.category;
  const stance = attr(product, "ایستایی");

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const addToCart = () => {
    add(product.id, meter, centimeter);
    toast(
      `${usesMeters ? `${fa(order)} متر ` : ""}«${product.name}» به سبد خرید اضافه شد.`,
      { label: "مشاهده سبد", href: "/cart" },
    );
  };

  const renderBuyPanel = (mobileFixed: boolean) => (
    <section
      id={mobileFixed ? "footer-cart" : undefined}
      aria-label="انتخاب متراژ و ثبت سفارش"
      className={
        mobileFixed
          ? "fixed bottom-0 left-0 w-full border-t border-modi-gray-500 bg-white px-4 pb-3 pt-3 lg:hidden"
          : "hidden rounded-2xl bg-white p-4 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:block"
      }
    >
      {error && (
        <p role="alert" className="mb-2 rounded-lg bg-[#FFE3E3] px-3 py-2 text-center text-[11px] leading-5 text-[#C40000]">
          {error}
        </p>
      )}
      {!error && (price.nextTierHint || (onSale && price.label)) && (
        <p className="mb-2 rounded-lg bg-modi-purple-200 px-3 py-1.5 text-center text-[11px] leading-5 text-modi-purple-800">
          {price.nextTierHint || price.label}
        </p>
      )}
      <div dir="ltr" className="mb-3 flex items-end justify-center gap-6">
        <div className="text-right">
          <span className="block text-[11px] text-modi-gray-900">مبلغ کل</span>
          <span className="text-base font-extrabold text-modi-purple-800">
            {toman(total)}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col-reverse items-center gap-1 text-[11px] text-modi-gray-900">
            <UpSelect value={meter} options={METERS} format={fa} onChange={setMeter} />
            متر
          </div>
          {usesMeters && (
            <div className="flex flex-col-reverse items-center gap-1 text-[11px] text-modi-gray-900">
              <UpSelect value={centimeter} options={CM} format={fa} onChange={setCentimeter} />
              سانتی‌متر
            </div>
          )}
        </div>
      </div>
      <button
        disabled={!!error}
        onClick={addToCart}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-modi-purple-800 text-sm font-bold text-white disabled:opacity-50"
      >
        <Icon src="/img/add-t-cart-light.svg" size={17} />
        {t("addToCart", "ثبت سفارش")}
      </button>
    </section>
  );

  return (
    <main className="page-bg pb-6 lg:pb-16">
      <section id="breadcrumb-title">
        <div className="flex h-12 items-center justify-end gap-1 bg-white px-4 text-xs text-modi-gray-900 shadow-sm lg:h-14 lg:px-8">
          <div className="modi-container flex items-center justify-end gap-1 px-0">
            <Link href="/">خانه</Link> » <Link href="/shop">فروشگاه</Link> »{" "}
            <Link href={`/materials/${slugify(product.category)}`}>{product.category}</Link> »{" "}
            <span className="truncate text-[#2b2740]">{product.name}</span>
          </div>
        </div>
      </section>

      <section className="single-product modi-container p-4 lg:px-8 lg:py-8">
        <div className="lg:flex lg:items-start lg:gap-10">
          {/* left column: gallery + specs (desktop) */}
          <div className="lg:sticky lg:top-24 lg:w-[42%] lg:shrink-0">
            <div className="product-image relative">
              <button
                type="button"
                onClick={() => setLightbox(true)}
                aria-label="بزرگ‌نمایی تصویر"
                className="block w-full cursor-zoom-in"
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  width={400}
                  height={400}
                  className="aspect-square w-full rounded-2xl object-cover"
                  priority
                />
              </button>
              <WishlistButton productId={product.id} className="absolute left-3 top-3" />
              {onSale && (
                <span className="absolute right-3 top-3 rounded-lg bg-[#C40000] px-2 py-1 text-[11px] font-bold text-white">
                  {fa(price.percentOff)}٪ تخفیف
                </span>
              )}
            </div>

            {/* title/price — mobile only, right below the image. The desktop
                copy lives in the right column below, next to the buy panel. */}
            <div className="lg:hidden">
              <TitleBlock product={product} onSale={onSale} unitPrice={unitPrice} usesMeters={usesMeters} showStock={showStock} />
            </div>

            {/* three spec tiles */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <SpecTile icon="/img/spec-width.svg" label="عرض" value={width ?? "—"} />
              <SpecTile
                icon="/img/spec-material.svg"
                label="جنس"
                value={material}
                href={`/materials/${slugify(product.category)}`}
              />
              <SpecTile icon="/img/spec-static.svg" label="ایستایی" value={stance ?? "—"} />
            </div>

            <div className="mt-3 flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-2 text-center font-bold text-modi-purple-800 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.3)]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden className="shrink-0">
                  <path d="M3 17h18M3 7h18M7 7v10M12 7v10M17 7v10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {t("guideButton", "راهنمای خرید متراژ")}
              </button>
              <button
                type="button"
                onClick={() =>
                  product.videoUrl
                    ? window.open(product.videoUrl, "_blank", "noopener")
                    : toast("ویدیوی معرفی این پارچه به‌زودی اضافه می‌شود.")
                }
                className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-2 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.3)] ${
                  product.videoUrl ? "font-bold text-modi-purple-800" : "text-modi-gray-900"
                }`}
              >
                <svg width="12" height="14" viewBox="0 0 10 12" aria-hidden className="shrink-0">
                  <path d="M0 0l10 6-10 6z" fill="#6b3fa0" />
                </svg>
                {t("videoButton", "ویدیو معرفی پارچه")}
              </button>
            </div>

            {/* buy panel lives here on desktop */}
            <div className="mt-4">{renderBuyPanel(false)}</div>
          </div>

          {/* right column: title/price (desktop only — mobile shows it right
              below the image, above) + tabs/related */}
          <div className="min-w-0 flex-1">
            <div className="hidden lg:block">
              <TitleBlock product={product} onSale={onSale} unitPrice={unitPrice} usesMeters={usesMeters} showStock={showStock} />
            </div>

            {/* buy panel is fixed to the bottom on mobile */}
            {renderBuyPanel(true)}

            {variants.length > 0 && (
              <ColorwayStrip current={product} variants={variants} />
            )}

            {/* tabs */}
            <div className="mt-6">
              <ul
                role="tablist"
                className="wc-tabs flex gap-5 rounded-xl bg-white px-4 py-3 text-[13px] shadow-[0_2px_14px_-8px_rgba(43,39,64,0.3)]"
              >
                {tabs.map((t) => (
                  <li key={t.key} className={tab === t.key ? "active" : ""}>
                    <button
                      type="button"
                      role="tab"
                      id={`tab-${t.key}`}
                      aria-selected={tab === t.key}
                      aria-controls={`panel-${t.key}`}
                      onClick={() => setTab(t.key)}
                      className="cursor-pointer"
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>

              <div
                role="tabpanel"
                id={`panel-${tab}`}
                aria-labelledby={`tab-${tab}`}
                className="mt-3 rounded-xl bg-white p-4 text-[13px] leading-8 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.3)]"
              >
                {tab === "specs" && (
                  <table className="spec-table w-full border-separate border-spacing-y-1">
                    <tbody>
                      {product.attributes.map((a) => (
                        <tr key={a.label}>
                          <th scope="row">{a.label}</th>
                          <td>{a.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {tab === "desc" && (
                  <div className="space-y-3 text-right">
                    {productParagraphs(product).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                    <button
                      type="button"
                      onClick={() => setGuideOpen(true)}
                      className="text-xs font-bold text-modi-purple-800 underline underline-offset-4"
                    >
                      راهنمای انتخاب متراژ
                    </button>
                  </div>
                )}
                {tab === "reviews" && (
                  <>
                    <Reviews productName={product.name} slug={product.slug} reviews={reviews} />
                    <Questions slug={product.slug} questions={questions} />
                  </>
                )}
              </div>
            </div>

            {related.length > 0 && (
              <div className="-mx-4 lg:mx-0">
                <ProductCarousel title={t("relatedTitle", "محصولات مرتبط")} products={related} />
              </div>
            )}
          </div>
        </div>
      </section>

      {guideOpen && (
        <SizeGuide
          width={width}
          minOrder={product.limit}
          onClose={() => setGuideOpen(false)}
        />
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={product.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2740]/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="بستن"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
          >
            ×
          </button>
          <Image
            src={product.image}
            alt={product.name}
            width={1000}
            height={1000}
            className="max-h-full w-auto max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </main>
  );
}

function Reviews({ productName, slug, reviews }: { productName: string; slug: string; reviews: PublicReview[] }) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const list = (
    <>
      {reviews.length > 0 && (
        <div className="mb-3 text-right">
          <p className="text-xs">
            <span className="text-[#f5a623]">{"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}</span>{" "}
            <span className="font-bold">{fa(Math.round(avg * 10) / 10)}</span> از ۵ · {fa(reviews.length)} دیدگاه
          </p>
          <ul className="mt-2 space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl bg-modi-gray-300 p-3">
                <p className="text-xs">
                  <span className="font-bold">{r.name}</span>
                  {r.verified && <span className="ms-1 rounded bg-[#eaf7dc] px-1 text-[10px] text-[#5c9a00]">خرید تاییدشده</span>}
                  <span className="ms-2 text-[#f5a623]">{"★".repeat(r.rating)}</span>
                </p>
                <p className="mt-1 text-[13px] leading-7">{r.text}</p>
                {r.reply && <p className="mt-2 rounded-lg bg-modi-purple-200 px-3 py-1.5 text-xs leading-6 text-modi-purple-800"><span className="font-bold">پاسخ مدیلیش: </span>{r.reply}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  if (!open)
    return (
      <div className="py-2 text-right">
        {list}
        {reviews.length === 0 && (
          <p className="text-xs leading-6 text-modi-gray-900">
            هنوز دیدگاهی برای این محصول ثبت نشده است. اولین نفری باشید که تجربه‌اش را می‌نویسد.
          </p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex h-9 items-center rounded-lg bg-modi-purple-200 px-4 text-xs font-bold text-modi-purple-800"
        >
          ثبت دیدگاه
        </button>
      </div>
    );

  return (
    <form
      className="text-right"
      onSubmit={async (e) => {
        e.preventDefault();
        if (text.trim().length < 5 || sending) return;
        setSending(true);
        try {
          const phone = getCheckout()?.mobile || getCheckout()?.phone || undefined;
          const { status } = await submitReviewAction({ slug, name, phone, rating: stars, text });
          toast(status === "approved" ? "دیدگاه شما منتشر شد." : "دیدگاه شما دریافت شد و پس از بررسی منتشر می‌شود.");
          setOpen(false);
          setText("");
        } catch {
          toast("ثبت دیدگاه انجام نشد.");
        } finally {
          setSending(false);
        }
      }}
    >
      <p className="text-xs font-bold">دیدگاه شما درباره «{productName}»</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="نام شما (اختیاری)"
        className="mt-2 h-9 w-full rounded-lg bg-modi-gray-300 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500"
      />
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label="امتیاز">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${fa(n)} ستاره`}
            onClick={() => setStars(n)}
            className={`text-xl leading-none ${n <= stars ? "text-[#f5a623]" : "text-modi-gray-500"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="جنس، رنگ، ایستایی و تجربه دوخت‌تان را بنویسید…"
        className="mt-3 min-h-24 w-full rounded-lg bg-modi-gray-300 p-3 text-sm leading-6 outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={text.trim().length < 5 || sending}
          className="h-9 rounded-lg bg-modi-purple-800 px-4 text-xs font-bold text-white disabled:opacity-50"
        >
          {sending ? "در حال ارسال…" : "ارسال دیدگاه"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-lg bg-modi-gray-500 px-4 text-xs text-gray-800"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}

/** پرسش و پاسخ — questions go to admin → دیدگاه‌ها → پرسش‌ها; answered ones show here (§4.10). */
function Questions({ slug, questions = [] }: { slug: string; questions?: { id: string; name: string; text: string; answer: string }[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <div className="mt-5 border-t border-modi-gray-500 pt-4 text-right">
      <p className="text-xs font-bold">پرسش و پاسخ{questions.length > 0 && ` (${fa(questions.length)})`}</p>
      {questions.length > 0 && (
        <ul className="mt-2 space-y-2">
          {questions.map((q) => (
            <li key={q.id} className="rounded-xl bg-modi-gray-300 p-3 text-[13px] leading-7">
              <p><span className="font-bold">{q.name}:</span> {q.text}</p>
              <p className="mt-1 rounded-lg bg-white px-3 py-1.5 text-xs leading-6 text-modi-purple-800"><span className="font-bold">پاسخ مدیلیش: </span>{q.answer}</p>
            </li>
          ))}
        </ul>
      )}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex h-9 items-center rounded-lg bg-modi-gray-300 px-4 text-xs font-bold text-[#2b2740]">
          پرسیدن سوال
        </button>
      ) : (
        <form
          className="mt-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (text.trim().length < 5 || sending) return;
            setSending(true);
            try {
              const phone = getCheckout()?.mobile || getCheckout()?.phone || undefined;
              await submitQuestionAction({ slug, name, phone, text });
              toast("پرسش شما ثبت شد؛ پاسخ همین‌جا منتشر می‌شود.");
              setOpen(false);
              setText("");
            } catch {
              toast("ثبت پرسش انجام نشد.");
            } finally {
              setSending(false);
            }
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام شما (اختیاری)" className="h-9 w-full rounded-lg bg-modi-gray-300 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="سوالتان درباره این پارچه…" className="mt-2 min-h-20 w-full rounded-lg bg-modi-gray-300 p-3 text-sm leading-6 outline-none focus:bg-white focus:ring-2 focus:ring-modi-purple-500" />
          <div className="mt-2 flex gap-2">
            <button type="submit" disabled={text.trim().length < 5 || sending} className="h-9 rounded-lg bg-modi-purple-800 px-4 text-xs font-bold text-white disabled:opacity-50">
              {sending ? "در حال ارسال…" : "ارسال پرسش"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg bg-modi-gray-500 px-4 text-xs text-gray-800">انصراف</button>
          </div>
        </form>
      )}
    </div>
  );
}

function TitleBlock({
  product,
  onSale,
  unitPrice,
  usesMeters,
  showStock,
}: {
  product: Product;
  onSale: boolean;
  unitPrice: number;
  usesMeters: boolean;
  showStock: boolean;
}) {
  return (
    <div className="mt-4 lg:mt-0">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-base font-bold leading-7 lg:text-2xl lg:leading-9">
          {product.name}
        </h1>
        <span
          className={`mt-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
            product.meters > 0
              ? "bg-[#eaf7dc] text-[#5c9a00]"
              : "bg-[#FFE3E3] text-[#C40000]"
          }`}
        >
          {product.meters > 0
            ? showStock
              ? `موجود · ${fa(product.meters)} ${product.unit}`
              : "موجود"
            : "ناموجود"}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-bold text-modi-purple-800 lg:text-2xl">
          {toman(unitPrice)}
        </span>
        <span className="text-xs text-modi-gray-900">/ هر {product.unit}</span>
        {onSale && <del className="text-xs text-modi-gray-900">{toman(product.price)}</del>}
        {onSale && (
          <span className="rounded bg-[#FFE3E3] px-1.5 py-0.5 text-[10px] font-bold text-[#C40000]">
            {fa(Math.round((1 - unitPrice / product.price) * 100))}٪
          </span>
        )}
      </div>
      {usesMeters && (
        <p className="mt-1.5 text-[11px] leading-5 text-modi-gray-900">
          فروش متری · حداقل سفارش {fa(product.limit)} متر · قابل انتخاب با دقت ۱۰ سانتی‌متر
        </p>
      )}
    </div>
  );
}

function SpecTile({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-modi-purple-200">
        <Icon src={icon} size={20} />
      </span>
      <span className="mt-2 block font-bold text-modi-purple-800">{label}</span>
      <span className="mt-1 block text-[11px] leading-4 text-modi-gray-900">
        {value}
      </span>
    </>
  );
  const cls =
    "flex flex-col items-center rounded-xl bg-white p-3 shadow-[0_2px_14px_-8px_rgba(43,39,64,0.3)]";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
