// Site content model + defaults — browser-safe (no fs). The defaults are the
// values the storefront hard-coded until now; lib/siteStore.ts overlays what
// the admin has saved on top of them.
import { brand, articles, type Article } from "./content";
import { deliveryHours, iranStates } from "./iran";

/* ---------------- layouts (home / offer) — docs/admin-spec.md §4.5 ---------------- */

export type HeroSlide = { title: string; sub: string; cta: string; href: string; img: string };

export type CircleItem = {
  label: string;
  /** family → /materials/…, pattern → /shop?pattern=, query → /shop?q=, url → custom */
  kind: "family" | "pattern" | "query" | "url";
  value: string;
  /** optional explicit photo; otherwise picked from the first matching product */
  img?: string;
};

export type RowSource =
  | { kind: "material" | "pattern" | "usage" | "query"; value: string }
  | { kind: "newest" | "onSale" }
  | { kind: "manual"; skus: string[] };

export type SectionType =
  | "hero"
  | "circles"
  | "productRow"
  | "infoCard"
  | "banner"
  | "magazine"
  | "brand"
  | "countdown"
  | "richText";

type Base = { id: string; visible: boolean; device: "all" | "mobile" | "desktop" };

export type Section =
  | (Base & { type: "hero"; props: { slides: HeroSlide[]; intervalMs: number } })
  | (Base & { type: "circles"; props: { items: CircleItem[] } })
  | (Base & {
      type: "productRow";
      props: { title: string; href: string; source: RowSource; limit: number; hideOutOfStock: boolean };
    })
  | (Base & { type: "infoCard"; props: { title: string; text: string; href: string } })
  | (Base & { type: "banner"; props: { img: string; href: string; alt: string } })
  | (Base & { type: "magazine"; props: { title: string; linkText: string; limit: number } })
  | (Base & { type: "brand"; props: { title: string; text: string; image: string; href: string } })
  | (Base & { type: "countdown"; props: { title: string; text: string; weekday: number } })
  | (Base & { type: "richText"; props: { title: string; text: string } });

export type Layout = { sections: Section[] };

export type LayoutRecord = {
  draft: Layout;
  published: Layout;
  publishedAt?: string;
  history: { at: string; label: string; snapshot: Layout }[];
};

export const sectionTypeLabels: Record<SectionType, string> = {
  hero: "اسلایدر",
  circles: "دسته‌های منتخب",
  productRow: "ردیف محصولات",
  infoCard: "کارت اطلاع‌رسانی",
  banner: "بنر",
  magazine: "مجله",
  brand: "معرفی برند",
  countdown: "شمارش معکوس",
  richText: "متن آزاد",
};

export function newSectionId() {
  return "s" + Math.random().toString(36).slice(2, 8);
}

export function defaultSection(type: SectionType): Section {
  const base = { id: newSectionId(), visible: true, device: "all" as const };
  switch (type) {
    case "hero":
      return {
        ...base,
        type,
        props: {
          slides: [{ title: "عنوان اسلاید", sub: "زیرعنوان", cta: "مشاهده", href: "/shop", img: "/img/products/1005.jpg" }],
          intervalMs: 5000,
        },
      };
    case "circles":
      return { ...base, type, props: { items: [{ label: "کرپ", kind: "family", value: "کرپ" }] } };
    case "productRow":
      return {
        ...base,
        type,
        props: {
          title: "ردیف جدید",
          href: "/shop",
          source: { kind: "newest" },
          limit: 10,
          hideOutOfStock: true,
        },
      };
    case "infoCard":
      return { ...base, type, props: { title: "ارسال رایگان", text: "هرجا باشی، مدیلیش سفارشت رایگان ارسال میشه!", href: "" } };
    case "banner":
      return { ...base, type, props: { img: "/img/about.jpg", href: "/shop", alt: "بنر" } };
    case "magazine":
      return { ...base, type, props: { title: "تازه ترین های مجله مدیلیش", linkText: "مشاهده همه", limit: 1 } };
    case "brand":
      return {
        ...base,
        type,
        props: { title: "با ما بیشتر آشنا شوید", text: brand.historyParagraph, image: "/img/about.jpg", href: "/about-us" },
      };
    case "countdown":
      return {
        ...base,
        type,
        props: { title: "فروش فوق‌العاده این هفته", text: "تا پایان جمعه فرصت دارید", weekday: 5 },
      };
    case "richText":
      return { ...base, type, props: { title: "", text: "" } };
  }
}

const defaultHome: Layout = {
  sections: [
    {
      id: "hero",
      type: "hero",
      visible: true,
      device: "all",
      props: {
        intervalMs: 5000,
        slides: [
          {
            title: "کرپ حریر",
            sub: "سبک و خنک برای شال، روسری و شومیز — در ۱۶ رنگ",
            cta: "مشاهده رنگ‌ها",
            href: "/shop?q=کرپ حریر",
            img: "/img/products/1005.jpg",
          },
          {
            title: "کالکشن کتان و لینن",
            sub: "پارچه‌های تازه‌رسیده، متری از نیم متر",
            cta: "مشاهده کالکشن",
            href: "/materials/لینن",
            img: "/img/products/1029.jpg",
          },
        ],
      },
    },
    {
      id: "circles",
      type: "circles",
      visible: true,
      device: "all",
      props: {
        items: [
          { label: "کرپ حریر", kind: "query", value: "کرپ حریر" },
          { label: "کتان گاباردین", kind: "query", value: "کتان گاباردین" },
          { label: "لینن", kind: "family", value: "لینن" },
          { label: "دانتل", kind: "family", value: "دانتل" },
          { label: "خامه دوزی", kind: "pattern", value: "خامه دوزی" },
          { label: "سیلک طرح‌دار", kind: "family", value: "سیلک" },
          { label: "ابریشم", kind: "family", value: "ابریشم" },
          { label: "مخمل", kind: "family", value: "مخمل" },
          { label: "تافته", kind: "family", value: "تافته" },
          { label: "باتیک", kind: "family", value: "باتیک" },
        ],
      },
    },
    {
      id: "row-crepe",
      type: "productRow",
      visible: true,
      device: "all",
      props: { title: "کرپ حریر", href: "/materials/کرپ", source: { kind: "material", value: "کرپ" }, limit: 10, hideOutOfStock: false },
    },
    {
      id: "row-linen",
      type: "productRow",
      visible: true,
      device: "all",
      props: { title: "لنین های جذاب", href: "/materials/لینن", source: { kind: "material", value: "لینن" }, limit: 10, hideOutOfStock: false },
    },
    {
      id: "info",
      type: "infoCard",
      visible: true,
      device: "all",
      props: { title: "ارسال رایگان", text: "هرجا باشی، مدیلیش سفارشت رایگان ارسال میشه!", href: "" },
    },
    {
      id: "mag",
      type: "magazine",
      visible: true,
      device: "all",
      props: { title: "تازه ترین های مجله مدیلیش", linkText: "مشاهده همه", limit: 1 },
    },
    {
      id: "brand",
      type: "brand",
      visible: true,
      device: "all",
      props: { title: "با ما بیشتر آشنا شوید", text: brand.historyParagraph, image: "/img/about.jpg", href: "/about-us" },
    },
  ],
};

const defaultOffer: Layout = {
  sections: [
    {
      id: "cd",
      type: "countdown",
      visible: true,
      device: "all",
      props: { title: "فروش فوق‌العاده این هفته", text: "تخفیف‌های این هفته تا پایان جمعه فعال است.", weekday: 5 },
    },
    {
      id: "row-sale",
      type: "productRow",
      visible: true,
      device: "all",
      props: { title: "تخفیف‌دار", href: "/shop", source: { kind: "onSale" }, limit: 12, hideOutOfStock: true },
    },
  ],
};

/* ---------------- pages — §4.8 ---------------- */

/** Public URL of a page record. */
export function pageHref(slug: string) {
  return slug === "about" ? "/about-us" : slug === "contact" ? "/contact-us" : `/pages/${encodeURIComponent(slug)}`;
}

export type SitePage = {
  slug: string;
  title: string;
  status: "published" | "draft";
  /** paragraphs */
  body: string[];
  image?: string;
  /** about: differentiators list */
  bullets?: string[];
  /** about: show the category circles strip */
  showCircles?: boolean;
  /** contact: render the store's contact details from settings */
  showContact?: boolean;
};

const defaultPages: SitePage[] = [
  {
    slug: "about",
    title: "درباره مدیلیش",
    status: "published",
    body: [brand.historyParagraph],
    image: "/img/about.jpg",
    bullets: [...brand.differentiators],
    showCircles: true,
  },
  {
    slug: "contact",
    title: "تماس با ما",
    status: "published",
    body: ["برای پیگیری سفارش و مشاوره انتخاب پارچه، از راه‌های زیر با ما در تماس باشید."],
    showContact: true,
  },
  {
    slug: "guide",
    title: "راهنمای خرید متراژ",
    status: "published",
    body: [
      "متراژ لازم برای هر لباس به عرض پارچه، سایز شما و مدل دوخت بستگی دارد.",
      "برای مانتو حدود ۲٫۵ متر با عرض ۱۵۰ و برای شومیز حدود ۱٫۵ متر کافی است.",
    ],
  },
  { slug: "faq", title: "سوالات متداول", status: "published", body: ["حداقل سفارش نیم متر است و متراژ با دقت ۱۰ سانتی‌متر انتخاب می‌شود."] },
  { slug: "terms", title: "قوانین و شرایط", status: "published", body: ["ثبت سفارش در مدیلیش به معنی پذیرش قوانین استفاده از سایت است."] },
  { slug: "privacy", title: "حریم خصوصی", status: "published", body: ["اطلاعات شما فقط برای ارسال سفارش استفاده می‌شود و در اختیار دیگران قرار نمی‌گیرد."] },
  {
    slug: "guarantee",
    title: "گارانتی ۷ روزه",
    status: "published",
    body: [
      "در صورت ایراد، اشتباه در ارسال یا متراژ، تا ۷ روز پس از دریافت، بازگشت وجه یا تعویض رایگان انجام می‌شود.",
      "انصراف از خرید فقط برای پارچه‌های برش‌نخورده و کالاهای عددی در شرایط اولیه پذیرفته می‌شود.",
    ],
  },
];

/* ---------------- magazine — §4.7 ---------------- */

export type Post = Article & {
  status: "published" | "draft";
  author: string;
  authorType: "human" | "agent";
};

const defaultPosts: Post[] = articles.map((a) => ({
  ...a,
  status: "published",
  author: "تیم مدیلیش",
  authorType: "human",
}));

/* ---------------- settings — §4.14 ---------------- */

export type Coupon = {
  code: string;
  kind: "percent" | "fixed" | "free_shipping";
  value: number;
  minCartToman: number;
  maxDiscountToman: number;
  validUntil: string;
  usageCap: number;
  used: number;
  active: boolean;
};

export type SmsTemplate = { event: string; label: string; enabled: boolean; text: string; delay: string; locked?: boolean };

export type AdminUser = { id: string; name: string; phone: string; role: string; active: boolean; lastLogin: string };

export type PermissionRow = { view: boolean; edit: boolean; publish: boolean; delete: boolean };
export type Role = { id: string; name: string; locked: boolean; grid: Record<string, PermissionRow>; extras: string[] };

export type ApiKey = { id: string; name: string; role: string; prefix: string; expiresAt: string; lastUsed: string; revoked: boolean };

/* ---- marketing — §4.11 ---- */

export type DiscountScope = { kind: "all" | "material" | "pattern" | "usage" | "products"; values: string[] };

export type DiscountRule = {
  id: string;
  name: string;
  /** scope: % / fixed off a scope · volume: tiers by metres per line · cart: tiers by cart total */
  type: "scope" | "volume" | "cart";
  active: boolean;
  priority: number;
  stacking: "largest" | "stack";
  validFrom: string;
  validUntil: string;
  scope: DiscountScope;
  percent: number;
  fixedToman: number;
  tiers: { minQty: number; percent: number }[];
  cartTiers: { minToman: number; percent: number }[];
  /** flash sale: show a countdown on the offer page */
  flash: boolean;
};

export type ShippingRule = {
  id: string;
  name: string;
  active: boolean;
  type: "free_from_amount" | "free_from_meters" | "free_scope" | "free_segment" | "percent_off";
  threshold: number;
  scope: DiscountScope;
  segment: string;
  provinces: string[];
  validFrom: string;
  validUntil: string;
};

export type ShippingSettings = {
  /** decision #2: launch with free shipping everywhere */
  freeEverywhere: boolean;
  rules: ShippingRule[];
};

export type Campaign = {
  id: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  goal: string;
  status: "draft" | "active" | "ended";
  couponCodes: string[];
  discountRuleIds: string[];
  announcementText: string;
  announcementHref: string;
  landing: "none" | "offer";
  smsText: string;
};

export type ReferralSettings = {
  enabled: boolean;
  referrerReward: { kind: "percent" | "fixed" | "wallet"; value: number };
  refereeReward: { kind: "percent" | "fixed"; value: number };
  firstOrderOnly: boolean;
  maxUsesPerCode: number;
};

/* ---- attributes — §4.4 ---- */

export type AttributeMeta = {
  image: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  showInMenu: boolean;
  position: number;
};

/* ---- strings — §4.14 «متن‌ها» ---- */

export const defaultStrings: Record<string, string> = {
  addToCart: "ثبت سفارش",
  viewAll: "مشاهده همه",
  categoryMenu: "دسته بندی",
  allProducts: "همه محصولات",
  menuLabel: "خرید پارچه %s",
  cartEmpty: "سبد خرید خالی است!",
  couponPrompt: "کد تخفیف دارید؟ وارد کنید",
  freeShipping: "رایگان",
  minOrderError: "حداقل متراژ قابل سفارش %s متر است.",
  stockError: "فقط %s از این پارچه موجود است.",
  guideButton: "راهنمای خرید متراژ",
  videoButton: "ویدیو معرفی پارچه",
  specsTab: "مشخصات",
  descTab: "توضیحات",
  reviewsTab: "دیدگاه‌ها",
  relatedTitle: "محصولات مرتبط",
  colorwaysTitle: "رنگبندی",
  notFoundTitle: "صفحه‌ای که دنبالش بودید پیدا نشد",
  continueShopping: "ادامه خرید",
};

export const stringLabels: Record<string, string> = {
  addToCart: "دکمه خرید روی کارت و صفحه محصول",
  viewAll: "لینک «مشاهده همه» ردیف‌ها",
  categoryMenu: "عنوان مگامنو در هدر",
  allProducts: "لینک پایین مگامنو",
  menuLabel: "برچسب جنس در منو (%s = نام جنس)",
  cartEmpty: "متن سبد خالی",
  couponPrompt: "متن کادر کد تخفیف در سبد",
  freeShipping: "برچسب ارسال رایگان در سبد",
  minOrderError: "خطای حداقل متراژ (%s = مقدار)",
  stockError: "خطای کمبود موجودی (%s = مقدار)",
  guideButton: "دکمه راهنمای متراژ",
  videoButton: "دکمه ویدیو",
  specsTab: "تب مشخصات",
  descTab: "تب توضیحات",
  reviewsTab: "تب دیدگاه‌ها (تعداد خودکار اضافه می‌شود)",
  relatedTitle: "عنوان ریل محصولات مرتبط",
  colorwaysTitle: "عنوان ریل رنگ‌بندی",
  notFoundTitle: "عنوان صفحه ۴۰۴",
  continueShopping: "دکمه ادامه خرید",
};

/* ---- notifications — §4.15 ---- */

export const notificationEvents: { key: string; label: string }[] = [
  { key: "order_paid", label: "سفارش جدید پرداخت‌شده" },
  { key: "order_failed", label: "پرداخت ناموفق" },
  { key: "low_stock", label: "موجودی کم" },
  { key: "review", label: "دیدگاه جدید" },
  { key: "question", label: "پرسش جدید" },
  { key: "message", label: "پیام تماس" },
  { key: "import", label: "درون‌ریزی تمام شد" },
  { key: "integration", label: "خطای پیامک / درگاه" },
];

export type NotificationPref = { inApp: boolean; sms: boolean; push: boolean };

export type SiteSettings = {
  store: {
    name: string;
    legalName: string;
    phone: string;
    telegram: string;
    telegramUrl: string;
    instagram: string;
    email: string;
    address: string;
    workingHours: string;
    copyright: string;
  };
  header: {
    announcement: { enabled: boolean; text: string; href: string };
    searchPlaceholder: string;
    menuItems: { label: string; href: string }[];
    megaDesktop: number;
    megaMobile: number;
  };
  footer: {
    aboutTitle: string;
    boilerplate: string;
    quickLinks: { label: string; href: string }[];
    showEnamad: boolean;
  };
  delivery: {
    pickupEnabled: boolean;
    codEnabled: boolean;
    closedWeekdays: number[];
    hours: string[];
    daysAhead: number;
    provinces: string[];
    defaultProvince: string;
    methods: { name: string; priceToman: number; eta: string; active: boolean }[];
  };
  payment: {
    merchantId: string;
    sandbox: boolean;
    currency: "IRT" | "IRR";
    zarinGate: boolean;
    description: string;
    walletEnabled: boolean;
    cardToCard: boolean;
    orderExpiryHours: number;
    /** decision #5: VAT line, hidden from the customer when 0 */
    vatPercent: number;
  };
  catalogue: {
    pageSize: number;
    defaultSort: "date" | "popularity" | "price" | "price-desc";
    chipPreview: number;
    colorwayLimit: number;
    relatedLimit: number;
    outOfStock: "show" | "hide";
    showStock: boolean;
  };
  seo: {
    titleTemplate: string;
    defaultDescription: string;
    robotsIndex: boolean;
    homeTitle: string;
    shopTitle: string;
    materialTitleTemplate: string;
  };
  reviews: { autoApproveVerified: boolean; requestSms: boolean; requestSmsDelayDays: number };
  sms: {
    templates: SmsTemplate[];
    serviceLine: string;
    promoLine: string;
    quietFrom: string;
    quietTo: string;
    dailyCap: number;
    signature: string;
    optOutKeyword: string;
  };
  integrations: {
    zarinpalMerchantId: string;
    zarinpalToken: string;
    kavenegarKey: string;
    kavenegarSender: string;
    s3Endpoint: string;
    s3Bucket: string;
    telegramBotToken: string;
    telegramChatId: string;
    googleVerification: string;
    analyticsId: string;
  };
  coupons: Coupon[];
  discountRules: DiscountRule[];
  shipping: ShippingSettings;
  campaigns: Campaign[];
  referral: ReferralSettings;
  attributeMeta: Record<string, AttributeMeta>;
  strings: Record<string, string>;
  notificationPrefs: Record<string, NotificationPref>;
  users: AdminUser[];
  roles: Role[];
  apiKeys: ApiKey[];
};

export const permissionAreas = [
  "سفارش‌ها",
  "محصولات",
  "ویژگی‌های پارچه",
  "صفحه اصلی / فروش ویژه",
  "مجله",
  "صفحات",
  "مشتریان",
  "دیدگاه‌ها و پیام‌ها",
  "بازاریابی",
  "پیامک",
  "رسانه",
  "تنظیمات",
] as const;

function grid(fill: (area: string) => PermissionRow): Record<string, PermissionRow> {
  return Object.fromEntries(permissionAreas.map((a) => [a, fill(a)]));
}
const all = (): PermissionRow => ({ view: true, edit: true, publish: true, delete: true });
const none = (): PermissionRow => ({ view: false, edit: false, publish: false, delete: false });
const viewOnly = (): PermissionRow => ({ view: true, edit: false, publish: false, delete: false });

const defaultRoles: Role[] = [
  { id: "owner", name: "مالک", locked: true, grid: grid(all), extras: ["لغو و بازپرداخت", "ویرایش مبلغ", "کیف پول", "مسدودکردن", "تغییر موجودی", "درون‌ریزی", "کاربران و دسترسی‌ها", "اتصال‌ها"] },
  {
    id: "manager",
    name: "مدیر فروشگاه",
    locked: false,
    grid: grid((a) => (a === "تنظیمات" ? { view: true, edit: true, publish: false, delete: false } : all())),
    extras: ["لغو و بازپرداخت", "ویرایش مبلغ", "کیف پول", "مسدودکردن", "تغییر موجودی", "درون‌ریزی"],
  },
  {
    id: "support",
    name: "پشتیبانی و انبار",
    locked: false,
    grid: grid((a) => {
      if (a === "سفارش‌ها" || a === "محصولات" || a === "مشتریان") return { view: true, edit: true, publish: false, delete: false };
      if (a === "دیدگاه‌ها و پیام‌ها") return all();
      if (a === "ویژگی‌های پارچه") return viewOnly();
      return none();
    }),
    extras: ["ثبت سفارش دستی", "پذیرش مرجوعی", "تغییر موجودی", "ارسال پیامک"],
  },
  {
    id: "content",
    name: "محتوا",
    locked: false,
    grid: grid((a) => {
      if (["صفحه اصلی / فروش ویژه", "مجله", "صفحات", "رسانه"].includes(a)) return all();
      if (a === "محصولات") return viewOnly();
      return none();
    }),
    extras: [],
  },
  {
    id: "writer",
    name: "نویسنده",
    locked: false,
    grid: grid((a) => (a === "مجله" ? { view: true, edit: true, publish: false, delete: false } : a === "محصولات" || a === "رسانه" ? viewOnly() : none())),
    extras: [],
  },
  { id: "ai-writer", name: "ربات نویسنده", locked: false, grid: grid((a) => (a === "مجله" ? { view: true, edit: true, publish: false, delete: false } : a === "محصولات" || a === "رسانه" ? viewOnly() : none())), extras: [] },
  {
    id: "marketing",
    name: "بازاریابی",
    locked: false,
    grid: grid((a) => {
      if (a === "بازاریابی") return all();
      if (a === "پیامک") return { view: true, edit: true, publish: false, delete: false };
      if (a === "مشتریان" || a === "محصولات") return viewOnly();
      if (a === "صفحه اصلی / فروش ویژه") return { view: true, edit: true, publish: false, delete: false };
      return none();
    }),
    extras: [],
  },
];

export const defaultSettings: SiteSettings = {
  store: {
    name: brand.name,
    legalName: brand.legalName,
    phone: "۰۲۱-۵۵۶۰۰۰۰۰",
    telegram: brand.telegram,
    telegramUrl: brand.telegramUrl,
    instagram: "modilish",
    email: "info@modilish.com",
    address: "تهران، بازار بزرگ، سرای پارچه‌فروشان، طبقه دوم، واحد ۱۲",
    workingHours: "شنبه تا پنجشنبه ۹ تا ۱۸",
    copyright: brand.copyright,
  },
  header: {
    announcement: { enabled: false, text: "ارسال رایگان تا پایان هفته", href: "/offer" },
    searchPlaceholder: "جستجوی پارچه، جنس یا طرح…",
    menuItems: [
      { label: "فروشگاه", href: "/shop" },
      { label: "درباره ما", href: "/about-us" },
      { label: "فروش فوق العاده", href: "/offer" },
    ],
    megaDesktop: 8,
    megaMobile: 14,
  },
  footer: {
    aboutTitle: "درباره مدیلیش",
    boilerplate: brand.boilerplate,
    quickLinks: [...brand.quickLinks],
    showEnamad: true,
  },
  delivery: {
    pickupEnabled: true,
    codEnabled: true,
    closedWeekdays: [5],
    hours: [...deliveryHours],
    daysAhead: 7,
    provinces: [...iranStates],
    defaultProvince: "تهران",
    methods: [
      { name: "پست پیشتاز", priceToman: 0, eta: "۲ تا ۴ روز کاری", active: true },
      { name: "پیک تهران", priceToman: 0, eta: "همان روز", active: false },
    ],
  },
  payment: {
    merchantId: "",
    sandbox: true,
    currency: "IRT",
    zarinGate: false,
    description: "سفارش {number} — مدیلیش",
    walletEnabled: true,
    cardToCard: true,
    orderExpiryHours: 24,
    vatPercent: 0,
  },
  catalogue: {
    pageSize: 16,
    defaultSort: "date",
    chipPreview: 12,
    colorwayLimit: 8,
    relatedLimit: 10,
    outOfStock: "show",
    showStock: true,
  },
  seo: {
    titleTemplate: "%s | مدیلیش",
    defaultDescription: "فروشگاه اینترنتی پارچه مدیلیش",
    robotsIndex: true,
    homeTitle: "مدیلیش | فروشگاه پارچه",
    shopTitle: "فروشگاه",
    materialTitleTemplate: "خرید پارچه %s در رنگ‌های مختلف",
  },
  reviews: { autoApproveVerified: false, requestSms: true, requestSmsDelayDays: 3 },
  sms: {
    templates: [
      { event: "otp", label: "کد تایید (OTP)", enabled: true, text: "کد ورود شما به مدیلیش: {code}", delay: "فوری", locked: true },
      { event: "paid", label: "ثبت سفارش", enabled: true, text: "سفارش {order} ثبت شد. به‌زودی آماده می‌شود. مدیلیش", delay: "فوری" },
      { event: "preparing", label: "در حال آماده‌سازی", enabled: false, text: "سفارش {order} در حال آماده‌سازی است.", delay: "فوری" },
      { event: "shipped", label: "ارسال شد", enabled: true, text: "سفارش {order} با {carrier} ارسال شد. کد رهگیری: {tracking}", delay: "فوری" },
      { event: "ready_for_pickup", label: "آماده تحویل حضوری", enabled: true, text: "سفارش {order} آماده تحویل است. {day} ساعت {hour} منتظرتان هستیم.", delay: "فوری" },
      { event: "delivered", label: "تحویل شد", enabled: true, text: "سفارش {order} تحویل شد. از خرید شما متشکریم.", delay: "فوری" },
      { event: "review", label: "درخواست نظر", enabled: true, text: "نظرتان درباره پارچه‌ای که خریدید را در {link} ثبت کنید.", delay: "۳ روز پس از تحویل" },
      { event: "cancelled", label: "لغو / بازپرداخت", enabled: true, text: "سفارش {order} لغو شد. مبلغ {amount} به {method} برگشت داده شد.", delay: "فوری" },
      { event: "wallet", label: "شارژ کیف پول", enabled: true, text: "{amount} تومان به کیف پول شما اضافه شد.", delay: "فوری" },
      { event: "admin_new_order", label: "هشدار مدیر: سفارش جدید", enabled: true, text: "سفارش جدید {order} به مبلغ {amount} از {name}", delay: "فوری" },
      { event: "admin_low_stock", label: "هشدار مدیر: موجودی کم", enabled: true, text: "«{product}» به {stock} متر رسید.", delay: "خلاصه روزانه ۰۹:۰۰" },
    ],
    serviceLine: "",
    promoLine: "",
    quietFrom: "22:00",
    quietTo: "08:00",
    dailyCap: 2000,
    signature: "مدیلیش",
    optOutKeyword: "لغو۱۱",
  },
  integrations: {
    zarinpalMerchantId: "",
    zarinpalToken: "",
    kavenegarKey: "",
    kavenegarSender: "",
    s3Endpoint: "",
    s3Bucket: "",
    telegramBotToken: "",
    telegramChatId: "",
    googleVerification: "",
    analyticsId: "",
  },
  coupons: [],
  discountRules: [],
  shipping: { freeEverywhere: true, rules: [] },
  campaigns: [],
  referral: {
    enabled: false,
    referrerReward: { kind: "wallet", value: 50000 },
    refereeReward: { kind: "percent", value: 5 },
    firstOrderOnly: true,
    maxUsesPerCode: 20,
  },
  attributeMeta: {},
  strings: defaultStrings,
  notificationPrefs: Object.fromEntries(notificationEvents.map((e) => [e.key, { inApp: true, sms: e.key === "order_paid" || e.key === "integration", push: false }])),
  users: [
    { id: "u1", name: "مو", phone: "09120000000", role: "owner", active: true, lastLogin: "امروز" },
  ],
  roles: defaultRoles,
  apiKeys: [],
};

export function newDiscountRule(): DiscountRule {
  return {
    id: "d" + Math.random().toString(36).slice(2, 8),
    name: "",
    type: "scope",
    active: true,
    priority: 10,
    stacking: "largest",
    validFrom: "",
    validUntil: "",
    scope: { kind: "all", values: [] },
    percent: 10,
    fixedToman: 0,
    tiers: [
      { minQty: 3, percent: 5 },
      { minQty: 5, percent: 10 },
    ],
    cartTiers: [{ minToman: 1_000_000, percent: 5 }],
    flash: false,
  };
}

export function newShippingRule(): ShippingRule {
  return {
    id: "s" + Math.random().toString(36).slice(2, 8),
    name: "",
    active: true,
    type: "free_from_amount",
    threshold: 1_500_000,
    scope: { kind: "all", values: [] },
    segment: "",
    provinces: [],
    validFrom: "",
    validUntil: "",
  };
}

export function newCampaign(): Campaign {
  return {
    id: "c" + Math.random().toString(36).slice(2, 8),
    name: "",
    slug: "",
    startsAt: "",
    endsAt: "",
    goal: "",
    status: "draft",
    couponCodes: [],
    discountRuleIds: [],
    announcementText: "",
    announcementHref: "/offer",
    landing: "offer",
    smsText: "",
  };
}

export type SiteContent = {
  layouts: { home: LayoutRecord; offer: LayoutRecord };
  pages: SitePage[];
  posts: Post[];
  settings: SiteSettings;
};

export const defaultSiteContent: SiteContent = {
  layouts: {
    home: { draft: defaultHome, published: defaultHome, history: [] },
    offer: { draft: defaultOffer, published: defaultOffer, history: [] },
  },
  pages: defaultPages,
  posts: defaultPosts,
  settings: defaultSettings,
};

/** Health checks the dashboard strip reads (§4.1) — real: keys present or not. */
export function integrationHealth(s: SiteSettings) {
  return {
    gateway: !!(s.integrations.zarinpalMerchantId || s.payment.merchantId),
    sms: !!s.integrations.kavenegarKey,
  };
}
