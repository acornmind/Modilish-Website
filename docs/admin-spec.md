# Modilish Admin — Product Specification

| | |
|---|---|
| **Version** | 1.0 — draft for review |
| **Date** | 7 September 2026 |
| **Owner** | Mo (mo@brantie.com) |
| **Applies to** | `Playground/modilish` (Next.js 16 / React 19 / Tailwind v4) |
| **Decisions taken** | New backend inside the Next.js app (Postgres + Prisma). Configurable roles with a permission grid (owner, manager, support & warehouse, content, writer, AI writer, marketing pre-built). Payment gateway: Zarinpal. |

---

## 1. Purpose

Modilish sells fabric by the metre. Today the storefront is a faithful Next.js port of the old WordPress theme, but **every piece of content is hard-coded**: the 392-product catalogue is a generated TypeScript file, the home page rows are literal JSX, the hero slides and category circles are arrays in `HeroSlider.tsx` and `lib/homeCategories.ts`, the store's pickup address is still lorem ipsum, and there is no order record anywhere — the checkout page is a placeholder.

The admin panel (`/admin`) gives the owner and their staff one place to run the shop without touching code:

- **Sell** — see every order the moment it is paid, move it through preparation, shipping or in-store pickup, and let the customer know by SMS.
- **Stock** — add and edit fabrics, photos, prices, sale prices and metre stock; import the supplier's spreadsheet in bulk.
- **Merchandise** — reorder, add and remove the rows on the home page, change the hero, the category circles, the special-offer page and the menu.
- **Publish** — write magazine posts and edit the about / contact / buying-guide pages.
- **Market** — product discounts of every common kind, coupon codes, shipping discounts, campaigns with landing pages, customer segments and SMS sends, referral rewards.
- **Message** — every SMS the shop sends: the text behind each order event, mass sends to a chosen group of customers, the log of what went out and what it cost.
- **Configure** — delivery days and hours, modular shipping rules, Zarinpal, SEO, footer, staff accounts and what each one may do.

The rule that decides scope: **if the storefront renders it, the admin can change it.** Section 8 lists every hard-coded value in the current code and where it moves to.

### 1.1 Out of scope for v1

Accounting and tax invoices beyond a printable order sheet · multi-warehouse · multi-currency / multi-language · marketplace feeds (Digikala, Torob) · a customer-facing app.

### 1.2 Principles

1. **Phone-first for orders, desktop-first for content.** The owner will check and confirm orders from a phone; product and page editing happens at a desk. Every screen works on both, but the layout is tuned to that split.
2. **Same design language as the shop.** IRANYekan, the `modi-purple` / `modi-gray` tokens, white rounded-2xl cards on `#f6f4f8`, RTL, Persian digits, Jalali dates. An admin that looks like the shop is instantly familiar.
3. **Never lose work.** Drafts autosave. Publishing is a separate, explicit step for anything customer-visible. Destructive actions confirm and can be undone for 10 seconds.
4. **Plain Persian.** Labels say what happens: «انتشار», «ارسال شد», «ذخیره پیش‌نویس». No WooCommerce jargon, no untranslated strings (the current My-Account pages still show English WooCommerce text — that goes away).
5. **Every write is recorded.** Who changed what, when, from where — visible in the audit log.

---

## 2. Users, roles and sign-in

### 2.1 Roles and access levels

Access is defined in **تنظیمات → کاربران و دسترسی‌ها** (`/admin/settings/users`, §4.14). It has two tabs:

- **کاربران** — who can sign in: name, phone, role, status, last sign-in. «دعوت کاربر» asks for a phone number and a role; the person signs in with that phone and is immediately inside.
- **نقش‌ها** — what each role may do. A role is a name plus a **permission grid**: one row per area of the admin, columns **مشاهده · ویرایش · انتشار · حذف** (view / edit / publish / delete), plus a few area-specific switches (e.g. for Orders: «لغو و بازپرداخت», «ویرایش مبلغ»; for Customers: «کیف پول», «مسدودکردن»; for Products: «تغییر موجودی», «درون‌ریزی»). Ticking «ویرایش» implies «مشاهده». The owner can create as many roles as needed; a role in use by a user cannot be deleted, only renamed or edited.

The system ships with these roles pre-built (all editable except مالک):

| Role | Intended for | Starting permissions |
|---|---|---|
| **مالک** (owner) | you | everything, including Settings, Users & roles, audit log, integrations. Cannot be edited or removed; there must always be at least one. |
| **مدیر فروشگاه** (store manager) | a trusted second-in-command | everything except Users & roles and Integrations |
| **پشتیبانی و انبار** (support & warehouse) | whoever packs and answers the phone | Orders: view, edit, status, print, manual order, returns intake — not cancel/refund or price edits · Products: view, edit, stock · Customers: view, notes · SMS: single send and sent log · Reviews & messages: full · Dashboard |
| **محتوا** (content) | whoever runs the home page and pages | Home & offer builders: edit draft + publish · Pages, Menu & footer, Media: full · Magazine: full · Products: view |
| **نویسنده** (writer) | a human blog writer | Magazine: create and edit own posts, submit for review · Media: upload · Products: view (to embed) |
| **ربات نویسنده** (AI writer) | an AI agent posting through the Content API (§7.1) | same as نویسنده, and every post it creates lands in «نیازمند بازبینی» unless the key is explicitly given «انتشار» |
| **بازاریابی** (marketing) | campaign work | Marketing: full (discounts, coupons, campaigns, segments) · SMS: mass sends, single send, log — not the automatic templates or SMS settings · Customers: view, tags · Home & offer builders: edit draft · Dashboard and reports |

Permissions are checked on the server for every action, not just hidden in the UI. Users see the sections they can use; forbidden sections are absent from their navigation rather than greyed out. Every permission change is written to the audit log with before/after.

**API keys.** The same tab has «کلیدهای API» for non-human users (an AI writing agent, a future mobile app): each key has a name, a role (which bounds what it can do), an optional expiry, and is shown once at creation. Keys are revocable and their calls are audited like a user's.

### 2.2 Sign-in

Admins sign in the same way customers do — **phone number + SMS one-time code via Kavenegar** — but only phone numbers on the admin allow-list may proceed. This keeps one auth system for the whole app and gives two-factor security for free.

- `/admin/login`: one phone field, «دریافت کد». Then a 6-digit code field with a 120-second resend timer.
- **One phone format everywhere.** Phones are stored as 11-digit `09…`. Input accepts Persian or Latin digits, `+98…`, `0098…` and the 10-digit form without the leading zero (which is what the storefront's `PhoneGate` currently asks for) and normalises before lookup. Codes are 6 digits for both customers and admins — the storefront gate changes to match (§8).
- Codes expire after 5 minutes; 5 wrong attempts lock the number for 15 minutes; at most 3 codes per number per hour.
- Sessions are httpOnly cookies, 30 days, renewed on activity. «خروج از همه دستگاه‌ها» is available in the user menu.
- The owner invites staff by phone number (Settings → Users). The invitee simply signs in; no password to hand over. Deactivating a user ends their sessions immediately.
- The Kavenegar key currently hard-coded in the old theme's `app/ajax.php` is treated as leaked: a fresh key is stored only in environment variables / Settings, never in source.

---

## 3. Navigation and layout

### 3.1 Route map

```
/admin                      پیشخوان        Dashboard
/admin/orders               سفارش‌ها       Orders list (tabs by status)
/admin/orders/new                           Manual order (phone / walk-in customer)
/admin/orders/[id]                          Order detail
/admin/orders/returns       مرجوعی‌ها       Return requests and refunds
/admin/products             محصولات        Product list
/admin/products/new                         New product
/admin/products/[id]                        Product editor
/admin/products/import                      Bulk import (CSV / XLSX)
/admin/attributes           ویژگی‌های پارچه Materials, patterns, usages, stance, colours, seasons
/admin/attributes/[type]/[id]               Attribute value (name, image, description, SEO)
/admin/home                 صفحه اصلی      Home page builder
/admin/offer                فروش فوق‌العاده Offer page builder (same builder + countdown)
/admin/magazine             مجله           Posts
/admin/magazine/new, /[id]                  Post editor
/admin/pages                صفحات          About, contact, buying guide, FAQ, custom pages
/admin/pages/[slug]                         Page editor
/admin/customers            مشتریان        Customer list
/admin/customers/[id]                       Customer detail
/admin/reviews              دیدگاه‌ها      Review & question moderation
/admin/marketing            بازاریابی      Discounts · Coupons · Shipping discounts · Campaigns · Segments · SMS campaigns · Referral · Reports
/admin/navigation           منو و فوتر     Main menu, mega-menu values, footer
/admin/sms                  پیامک          Automatic messages · Mass SMS · Single send · Sent log · SMS settings
/admin/media                رسانه          Media library
/admin/settings             تنظیمات        Store · Delivery & shipping rules · Payment (Zarinpal) · Catalogue · SMS · SEO · Strings
/admin/settings/users                       Users, roles & permission grid, API keys
/admin/settings/integrations                All external keys and placeholders in one place
/admin/settings/audit                       Audit log
/admin/login                                Sign-in
```

### 3.2 Shell

**Desktop (≥ 1024 px).** A 264 px sidebar on the **right** (RTL), white, with the Modilish logo at top, one link per section with a small line icon (the same icon set as `AccountNav.tsx`), the active item filled `modi-purple-800` with white text and a pill radius — exactly the treatment the storefront's account navigation already uses. Section counts appear as small badges (orders awaiting action, reviews pending). A top bar holds a global search box (`⌘K` / `Ctrl+K`), a bell for notifications, «مشاهده سایت» opening the storefront in a new tab, and the user menu. Content area is `#f6f4f8` with white cards.

**Mobile (< 1024 px).** A 64 px top bar (hamburger · page title · bell) matching the storefront header height, and a **bottom tab bar** with four tabs: پیشخوان · سفارش‌ها · محصولات · بیشتر. «بیشتر» opens a sheet listing every other section. Order and product lists become card lists; editors become single-column forms with a sticky «ذخیره» bar at the bottom, mirroring the storefront's `#footer-cart` purchase bar.

**Unsaved-changes bar.** Any editor with pending edits shows a slim bar pinned above the bottom edge: «تغییرات ذخیره نشده» with «ذخیره» and «انصراف». Navigating away prompts once.

### 3.3 Design tokens (reused from `app/globals.css`)

| Token | Value | Admin use |
|---|---|---|
| `modi-purple-800` | `#6b3fa0` | primary buttons, active nav, links |
| `modi-purple-500` | `#a58bc5` | secondary buttons, focus rings |
| `modi-purple-200` | `#f5ecff` | tinted chips, hover rows, soft buttons |
| `modi-gray-300/500/700` | `#f9f9f9 / #f1f1f1 / #ededed` | inputs, table headers, dividers |
| `modi-gray-900` | `#aaaaaa` | placeholder / muted text |
| ink | `#2b2740` | body text |
| page | `#f6f4f8` | content background |
| card shadow | `0 2px 16px -10px rgba(43,39,64,.35)` | every card |
| **new — semantic** | `#1f9d55` success · `#d97706` warning · `#c40000` danger · `#2563eb` info | status pills, toasts, low-stock |

Font: `modilish` (IRANYekan) for everything; `font-variant-numeric: tabular-nums` on every number column. Persian digits everywhere via `toLocaleString("fa-IR")`; Jalali dates via `Intl.DateTimeFormat("fa-IR-u-ca-persian")`.

---

## 4. Screens

Each screen below lists what it is for, what it shows, what the user can do, and the edge cases that must be handled.

### 4.1 پیشخوان — Dashboard

The owner opens this on their phone in the morning. It must answer «چه چیزی منتظر من است؟» in one glance.

**Top: needs-attention strip** (only shown when non-zero, each is a link)

- ‹n› سفارش پرداخت‌شده در انتظار آماده‌سازی
- ‹n› سفارش آماده تحویل حضوری امروز
- ‹n› پارچه با موجودی کم (below each product's threshold)
- ‹n› دیدگاه در انتظار تایید
- درگاه پرداخت / پیامک متصل نیست (only if a health check fails)

**KPI tiles** (period selector: امروز · ۷ روز · ۳۰ روز · ماه جاری), four across on desktop, two across on mobile: سفارش‌ها (count), فروش (Toman), میانگین سبد, متراژ فروخته‌شده (metres sold — the number a fabric shop actually thinks in). Each tile shows the delta versus the previous period and a small sparkline.

**Recent orders** — last 10, same row component as the orders list (§4.2), tap to open.

**Best sellers this period** — top 5 fabrics by metres sold, with stock remaining so a fast seller running low is obvious.

**Quick actions** — «افزودن پارچه», «نوشتن مطلب», «ویرایش صفحه اصلی».

### 4.2 سفارش‌ها — Orders

#### 4.2.1 List

Status tabs across the top with counts: **همه · در انتظار پرداخت · پرداخت‌شده · در حال آماده‌سازی · ارسال‌شده · آماده تحویل · تحویل‌شده · لغو / مرجوع**. Default tab is «پرداخت‌شده» (the actionable queue), not «همه».

Filters (a row of chips, collapsible on mobile): date range (Jalali picker with presets), delivery method (ارسال / حضوری), province, payment gateway status, «فقط دارای یادداشت مشتری».

Search: order number, customer name, phone, tracking code.

Columns (desktop table / mobile card): شماره سفارش · تاریخ و ساعت (Jalali, relative for < 24 h) · مشتری (name + phone, phone tap-to-call on mobile) · اقلام (thumbnail stack of up to 3 fabric photos + «۳ قلم · ۴٫۵ متر») · مبلغ · روش تحویل (icon: post / pickup with the chosen day-slot) · وضعیت (colour pill) · quick action button appropriate to the status («شروع آماده‌سازی», «ثبت کد رهگیری», «تحویل شد»).

Bulk selection: change status, print packing slips, export CSV.

Sort: newest first by default; by amount; by pickup slot (for the «آماده تحویل» tab, sorted by day then hour so the counter is ready in order).

Empty state per tab: «سفارشی در این وضعیت نیست» with an illustration in the storefront's empty-cart style.

New orders arrive live (SSE or polling every 30 s) with a subtle highlight; the browser tab title shows the count.

#### 4.2.2 Detail

Header: order number, status pill, the **primary next-step button** (big, purple, at the top on mobile), and a «⋯» menu (print, cancel, refund, resend SMS, copy link).

Left column (main):

- **اقلام** — each line: photo, fabric name (links to product), the exact cut «۲ متر و ۳۰ سانتی‌متر», unit price at the time of the order, line total, and the customer's per-line note if any («یک‌تکه بریده شود»). Sold-out-since-ordered lines are flagged. Staff can «ویرایش اقلام» while the order is pending or paid: change metres (with the same min/stock validation as the storefront), remove a line, add a line — with a required reason that is written to the timeline and, if the total changes, an option to refund the difference to the wallet.
- **مبالغ** — subtotal, discount (coupon code shown), shipping fee, total; payment gateway, reference number, paid at.
- **تحویل** — for shipping: the method the customer chose at checkout (e.g. پست پیشتاز, with the fee they paid), recipient name, mobile, landline, province, city, postcode, full address, «کپی آدرس» button, and the tracking-code field (carrier pre-filled from the chosen method, editable if staff ship differently). For pickup: the chosen day and hour slot, whether it is «پرداخت در محل», and a «تحویل شد» button that also records the cash/card payment when applicable.
- **مشتری** — name, phone, national code, referral (معرف, optional field collected at the address step), link to the customer page, count of previous orders, the order-level note the customer typed at checkout («توضیحات سفارش»).

Right column (desktop) / below (mobile):

- **زمان‌بندی (timeline)** — every status change, note, SMS sent, edit, refund, with actor and time.
- **یادداشت داخلی** — free text, staff-only, appended to the timeline.
- **پیامک به مشتری** — send a custom SMS from a set of templates (order ready, delay apology, address confirmation request).

Printing: «چاپ برگه بسته‌بندی» renders a print-optimised A5 sheet (items with cuts in large type, address, order number barcode); «چاپ فاکتور» renders an A4 invoice with the store's legal name, address and enamad.

#### 4.2.3 Status machine

An order has two independent axes: **وضعیت سفارش** (fulfilment, below) and **وضعیت پرداخت** (`unpaid` · `paid` · `cod_pending` · `refunded` · `partially_refunded`). The list and detail show the fulfilment status as the pill and the payment status as a small secondary tag when it is anything other than `paid`.

**Stock.** Stock is **reserved** when the order is created (so two customers cannot both buy the last 3 m during the gateway round-trip) and the reservation becomes a **deduction** on `paid`. Reservations are released on `failed`, `cancelled`, or expiry of an unpaid order (default 24 h, Settings → Payment). Cancelling a paid order or restocking a return writes a `+` stock movement.

| Status | Persian | Set by | Enters when |
|---|---|---|---|
| `pending_payment` | در انتظار پرداخت | system | checkout created the order and redirected to Zarinpal (or a payment link was sent for a manual order); stock reserved |
| `failed` | پرداخت ناموفق | system | gateway callback failed / cancelled by the customer; the customer may retry until the order expires |
| `paid` | پرداخت‌شده | system | gateway verified; reservation → deduction; confirmation SMS |
| `preparing` | در حال آماده‌سازی | staff | «شروع آماده‌سازی». Pickup orders with «پرداخت در محل» enter here directly from checkout with payment status `cod_pending` |
| `shipped` | ارسال‌شده | staff | tracking code entered (required) |
| `ready_for_pickup` | آماده تحویل حضوری | staff | pickup orders only |
| `delivered` | تحویل‌شده | staff / auto | «تحویل شد» (for `cod_pending` this also records the payment), or automatically 7 days after `shipped` |
| `cancelled` | لغو‌شده | owner / customer (only while unpaid) / system (expiry) | reason required; reservation released or stock returned; refund to wallet or gateway |
| `returned` | مرجوع‌شده | owner | within the 7-day guarantee, or a parcel lost in transit; reason, refund amount, restock yes/no |

Allowed transitions: `pending_payment → paid | failed | preparing (COD pickup) | cancelled` · `failed → paid | cancelled` · `paid → preparing | cancelled` · `preparing → shipped | ready_for_pickup | cancelled` · `shipped → delivered | returned` · `ready_for_pickup → delivered | cancelled` · `delivered → returned`. Anything else is rejected server-side. Moving backwards (e.g. `shipped → preparing`) is owner-only and logged with a reason.

#### 4.2.4 Customer notifications (SMS via Kavenegar `VerifyLookup` templates)

| Event | Template variables | Default text |
|---|---|---|
| paid | order no. | سفارش {n} ثبت شد. به‌زودی آماده می‌شود. مدیلیش |
| shipped | order no., carrier, tracking | سفارش {n} با {carrier} ارسال شد. کد رهگیری: {code} |
| ready_for_pickup | order no., day, hour | سفارش {n} آماده تحویل است. {day} ساعت {hour} منتظرتان هستیم. |
| delivered | order no. | از خرید شما متشکریم. نظرتان را در سایت ثبت کنید. |
| cancelled / returned | order no., amount | سفارش {n} لغو شد. مبلغ {amount} به کیف پول شما برگشت. |

Each template is edited in the **پیامک** section (§4.16.1) — text, variables, on/off, delay, preview — and every send is logged on the order timeline and in the SMS sent log with the Kavenegar message id.

#### 4.2.5 Manual orders («ثبت سفارش دستی»)

Fabric shops take orders by phone, Telegram and at the counter. «ثبت سفارش» on the orders list opens a form that mirrors the customer checkout: find or create the customer by phone → add lines with the same metre/centimetre picker and validation → choose delivery (shipping method with its computed fee, or pickup slot) → apply a coupon or a manual discount (with reason) → choose how it is paid: **لینک پرداخت** (an SMS with a Zarinpal payment link; the order waits in `pending_payment`), **پرداخت در محل**, **کارت‌به‌کارت / نقدی** (staff mark it paid and enter the reference), or **کیف پول**. Manual orders are tagged «دستی» and carry the creating user in the timeline.

#### 4.2.6 Returns and refunds — policy and flow

**Policy (shown on the storefront's «گارانتی ۷ روزه» page and enforced in the admin).** Fabric is cut to order, so the policy has to be explicit about what a customer can expect:

1. **Defect, wrong item, wrong length, damage in transit** — full refund including the shipping paid, or free replacement; return shipping is on the store. No time limit beyond the 7 days to report.
2. **Change of mind** — accepted within 7 days only if the fabric is uncut and undamaged; the shop refunds the goods, not the shipping, and the customer pays return postage. Configurable: the owner can turn change-of-mind returns off entirely for cut lengths, or set a restocking fee.
3. **Piece products** («عدد») follow the same rules but are also returnable if unused.
4. **Cancellation before shipping** is free and automatic: while an order is `paid` or `preparing` the customer can cancel from their account and the refund is issued without review.

**Flow.** Customer opens «درخواست مرجوعی» from the order in their account (or staff open one on their behalf): reason from a fixed list, free text, up to 5 photos, which lines and how much. It appears in **سفارش‌ها → مرجوعی‌ها** with status `requested`. Staff **approve** (choosing: customer ships back / courier pickup / no return needed for a small defect) or **reject** with a reason that goes to the customer by SMS. When the fabric is back, staff **inspect** and record: restock yes/no (with a stock movement), refund amount (defaults from the policy: goods, plus shipping when it is the store's fault), refund method. Then **refund** is issued and the return closes. Every step SMSes the customer and lands on the order timeline. Target SLA: decision within 2 working days, refund within 3 working days of receipt — shown as a countdown on the returns list so nothing silently ages.

**Refund methods, in order of preference.**

| Method | When | Mechanics |
|---|---|---|
| **کیف پول** (store wallet) | default offer; instant | `WalletTx` credit; the customer can spend it immediately or later ask for a payout |
| **بازگشت به درگاه** (Zarinpal refund) | the original payment was through Zarinpal and is still refundable | Zarinpal's refund endpoint against the original `authority`/`ref_id`; the gateway's fee handling is shown to staff before confirming; status polled and recorded in `Refund.gatewayStatus` |
| **کارت‌به‌کارت / شبا** (bank transfer) | gateway refund not possible or the customer asks for it | staff enter the IBAN the customer supplied, mark «پرداخت شد» with the bank reference; a reminder appears on the dashboard until done |
| **جایگزینی** (replacement) | defect and the fabric is in stock | a new zero-value order linked to the return, shipped free |

**Rules that keep refunds safe.** A refund can never exceed what was actually paid for that order (sum of `Payment` minus previous `Refund`s). Partial refunds are per line, with an optional extra amount for shipping or goodwill, each with a reason. Refunds need the «لغو و بازپرداخت» permission; above a configurable threshold (default 5,000,000 Toman) a second user with that permission must approve. Every refund creates a `Refund` row, a timeline event, an audit entry and, when restocked, a stock movement. The customer gets an SMS with the amount and method. The order's `paymentStatus` moves to `partially_refunded` or `refunded`. Monthly refund totals and reasons appear in Marketing → Reports so a recurring defect (one supplier's roll) is visible.

### 4.3 محصولات — Products

#### 4.3.1 List

View toggle: **grid** (photo-led, 4–6 per row, good for spotting a wrong photo) and **table** (dense, sortable). Mobile is always cards.

Columns: photo · نام · کد (SKU, e.g. `1001`) · جنس · قیمت (with sale price and a red strike-through when on sale, exactly like the storefront card) · موجودی (metres, with a warning tint under threshold and a red «ناموجود» at 0) · وضعیت (منتشرشده / پیش‌نویس / پنهان) · آخرین ویرایش.

Filters: material, pattern, usage, stance, status, on-sale, low-stock, no-photo, unit. Search across name, SKU, colours, description.

Bulk actions: publish / unpublish, set sale price (percentage or fixed, with schedule), adjust stock (+/− metres with reason), assign to a family, delete (owner only, with the count confirmation «۱۲ محصول حذف می‌شود»).

Inline edit for price and stock directly in the table (click a cell, type, Enter) — the two fields staff change most often.

«افزودن پارچه» primary button; «درون‌ریزی» secondary (→ 4.3.4); «برون‌ریزی» exports the current filtered list as CSV in the same column layout the import accepts.

#### 4.3.2 Editor

Two-column on desktop: the form on the right (RTL reading side), a sticky **live preview card** on the left showing exactly how the product card and the top of the product page will render. Single column on mobile with a sticky save bar.

**Creating a product starts with one question: «این محصول چطور فروخته می‌شود؟»** — **متری** (sold by length) or **عددی** (sold by piece). This is the `unit` and it is fixed once the product has been ordered. It shapes everything that follows: for متری, stock and minimum order are in metres with one decimal and the storefront shows the metre + centimetre picker; for عددی, stock and minimum are whole numbers, there is no centimetre anywhere, and every label says «عدد» / «تعداد». The list shows a small «متری» / «عددی» tag on each product. Nine of the current 392 products are عددی and the import sets this from the export's `unit` column.

**Sections (each a card):**

1. **اطلاعات پایه** — نام (required) · کد محصول / SKU (required, unique; becomes the URL slug `/product/1001`, matching the current scheme) · نوع فروش (متری / عددی, from the first step; read-only after the first order) · وضعیت (منتشرشده / پیش‌نویس / پنهان — hidden means reachable by URL but not listed) · یادداشت داخلی.
2. **رسانه** — **تصاویر**: multi-upload drop zone (several photos per product — full fabric, close-up weave, drape on a form, colour swatch), drag to reorder, first is the main image; each image gets an alt text (defaults to the product name); recommended 1200 × 1200, auto-converted to WebP with the original kept; a «برش مربعی» crop tool because every storefront surface renders square. **ویدیو**: one or more videos, each either **بارگذاری فایل** (mp4/webm up to a configurable size, default 100 MB; stored on object storage, a poster frame is extracted automatically) or **لینک** (paste an Aparat, YouTube or direct `.mp4` URL — Aparat and YouTube are recognised and embedded with their player; a direct URL uses the site's own player). Uploading to Aparat and pasting the link is the storage-free option and is what the editor suggests in the help text. The first video is the one behind the storefront's «ویدیو معرفی پارچه» button; extra videos appear in the product gallery after the photos. Each video has a title (default «معرفی پارچه») and a «نمایش در گالری» toggle.
3. **قیمت** — قیمت (Toman, per unit) · قیمت فروش ویژه (optional) · زمان‌بندی تخفیف (from / until, Jalali) · shows «٪ تخفیف» computed live. Prices accept Persian or Latin digits and thousands separators. Below it a read-only panel «تخفیف‌های فعال روی این محصول» lists every automatic discount from Marketing (§4.11) that currently touches this product — a volume tier, a material-wide sale, a customer-group price — with links, so staff always know why the storefront shows the price it shows.
4. **موجودی** — for متری: موجودی (metres, one decimal) · حداقل سفارش (default 0.5 m) · حداکثر در هر سفارش (optional cap; otherwise the storefront's metre selector runs up to the stock, replacing today's fixed 0–10 list) · آستانه هشدار موجودی (default 2 m); the 10 cm step is a storefront constant. For عددی: موجودی (integer) · حداقل سفارش (default 1) · حداکثر · آستانه هشدار (default 2). «تاریخچه موجودی» opens the adjustments log; «دریافت کالا» adds stock with a supplier reference. A **کلاس ارسال** select (سبک / معمولی / حجیم / سنگین — managed in Settings → Delivery) feeds the shipping rules.
   When stock reaches 0 the product stays visible with a «ناموجود» badge and a disabled button, and drops out of home rows that have «پنهان‌کردن ناموجود» on; the owner can switch listings to hide it entirely (Settings → Catalogue).
5. **مشخصات پارچه** — the attributes the storefront prints in the spec table and the three tiles: **خانواده جنس** (single-select, required — drives `/materials/…` and the menu; the 12 families: کتان، کرپ، لینن، …) · **جنس دقیق** (free text shown in the tile and spec table, e.g. «کتان گاباردین» or «لینن / لینن سوزن‌دوزی» — the current catalogue has this for ~350 products and it must survive import) · طرح (multi-select chips, e.g. سوزن‌دوزی، طلادوزی، هندسی) · ایستایی (single-select from the managed list in §4.4, seeded آهاردار / نیمه‌آهار / لخت; the import maps the four spellings in the current data onto these) · عرض (cm, number; rendered «۱۰۰ سانتی‌متر») · رنگ‌ها (free tags with a colour swatch each) · کاربرد (multi: کت، مانتو، پیراهن، دامن، شال، …) · زمان استفاده (multi: بهار، تابستان، پاییز، زمستان) · وزن هر متر (g, optional — only used if a by-weight shipping method is configured). New values can be created inline («+ افزودن») and are then managed in §4.4. The spec table on the storefront renders these in a fixed order: جنس، طرح، ایستایی، عرض، رنگ‌ها، کاربرد، زمان استفاده.
6. **توضیحات** — rich text (headings, bold, lists, links, images). «تولید خودکار» button drafts the description from the attributes in the same template the current catalogue uses («پارچه … از جنس … با عرض …») so staff never start from a blank box.
7. **رنگ‌بندی و محصولات مرتبط** — **خانواده رنگی**: pick or create a family (e.g. «کرپ حریر ساده»); every member appears in the other members' «رنگبندی» rail. This replaces today's approximation (same material category). **محصولات مرتبط**: auto (same family, then same material) with an optional manual override list.
8. **راهنمای خرید** — a per-product override for the «راهنمای خرید متراژ مناسب» popup, otherwise the global guide page (§4.8) is used. (Videos live in the رسانه section above; the «ویدیو معرفی پارچه» button appears only when a video exists.)
9. **سئو** — عنوان صفحه · توضیح متا · canonical; live Google-style snippet preview. Defaults come from the name and description.

Validation is inline and in Persian: «قیمت فروش ویژه باید کمتر از قیمت اصلی باشد», «کد محصول تکراری است (۱۰۰۱ متعلق به «تافته هندی…» است)». Save is «ذخیره» for drafts and «ذخیره و انتشار» for published products; both keep the user on the page with a toast «ذخیره شد».

Product page actions in the header: «مشاهده در سایت», «کپی محصول» (duplicate as draft with «(کپی)» suffix — the fastest way to add a new colourway), «حذف» (owner).

Changing a SKU (and therefore the URL) automatically records a 301 redirect from the old address; the same applies to material, post and page slugs (§6 `Redirect`).

#### 4.3.3 Stock adjustments log

Every change to `stock` is a row: date, user, delta (±metres), reason (فروش / مرجوعی / شمارش انبار / ضایعات / اصلاح), order link if applicable, running balance. Orders deduct automatically on `paid` and return on `cancelled`/`returned` (if restock is chosen).

#### 4.3.4 Bulk import / export

The old theme shipped an XLSX importer (`modules/extend-measurement-calc/inc/xlsx.php`); suppliers still send spreadsheets. The importer accepts CSV or XLSX with a downloadable template whose columns match the export (code, name, material, patterns, stance, width, colours, usages, seasons, price, sale price, stock, min order, unit, description, image filenames). Steps: upload → column mapping (auto-matched, editable) → preview with row-level validation (new vs update by SKU, errors highlighted) → «اعمال». Images referenced by filename are matched against the media library; missing ones are listed afterwards. Runs as a background job with a progress bar and a summary («۱۲۰ جدید، ۳۴ به‌روزرسانی، ۲ خطا»). Also the migration path for the existing `lib/catalog.ts` — that migration **keeps the existing numeric product ids** (544, 546, …) so carts and wishlists already sitting in customers' browsers keep working after the cut-over.

### 4.4 ویژگی‌های پارچه — Fabric attributes

One page with tabs: **جنس · طرح · کاربرد · ایستایی · رنگ · زمان استفاده**. Each tab lists values with product counts, drag-to-reorder (this order is what the menu, filters and the mega-menu use instead of today's «top N by count»), and per-value: name, slug, image (used for the home circles and material page header), short description (shown at the top of `/materials/کرپ`), SEO title/description, «نمایش در منو» toggle.

Actions: rename (updates every product), **merge** («لنین» into «لینن» — a real problem in the current data, where the home circle for «لنین ساده» has to query «لینن ساده»), delete (only when count is 0, otherwise offer merge).

### 4.5 صفحه اصلی — Home page builder

The core merchandising tool. The page is an **ordered list of sections**; the builder is a vertical list on the right (RTL) with a **live preview** of the storefront on the left, switchable between mobile (400 px shell, the shop's native width) and desktop.

**Section types** (the «+ افزودن بخش» sheet):

| Type | Persian | Settings |
|---|---|---|
| Hero slider | اسلایدر | slides: image (separate mobile 800×450 and desktop 1920×600), عنوان, زیرعنوان, متن دکمه, لینک; drag to reorder; auto-advance seconds |
| Category circles | دسته‌های منتخب | circles: عنوان, تصویر (auto-suggested from the attribute's image), مقصد (an attribute value → `/materials/…` or `/shop?pattern=…`, a search query → `/shop?q=…`, or a custom URL) |
| Product row | ردیف محصولات | عنوان · لینک «مشاهده همه» (auto from the source, editable) · منبع: **انتخاب دستی** (pick and order products with a search box) / **بر اساس جنس** / **طرح** / **کاربرد** / **خانواده رنگی** / **جدیدترین** / **پرفروش‌ترین** / **تخفیف‌دار** · تعداد (6–20) · «پنهان‌کردن ناموجود» |
| Info card | کارت اطلاع‌رسانی | icon/image, title, text, optional link — the current free-shipping card |
| Banner | بنر | image (mobile + desktop), link, full-bleed or inset |
| Magazine teaser | مجله | عنوان (default «تازه‌ترین‌های مجله مدیلیش»), متن لینک (default «مشاهده همه»), آخرین ‹n› مطلب or manual pick |
| Brand block | معرفی برند | image, title, text (defaults to the About page's first paragraph), link |
| Countdown | شمارش معکوس | title, mode: **تا تاریخ مشخص** (absolute end date-time) or **هفتگی** (to the next given weekday at 23:59, which is what the existing `CountDown` component does), linked product row, «پس از پایان پنهان شود» |
| Rich text | متن آزاد | rich text block |

**Per section:** eye toggle (پنهان / نمایان), drag handle, «⋯» (duplicate, move to top/bottom, delete with undo), device visibility (همه / فقط موبایل / فقط دسکتاپ — new; the storefront renders identical sections on both today), optional **schedule** (نمایش از … تا …) so a Nowruz banner can be set up in advance and disappear on its own. A section whose source is empty (a «تخفیف‌دار» row when nothing is on sale, a magazine teaser with no published post) is skipped by the renderer and flagged in the builder with «فعلاً محتوایی ندارد».

**Draft / publish.** Edits save automatically to a draft. «پیش‌نمایش» opens the draft on the real storefront via a signed preview link (shareable for 24 h). «انتشار» (owner) makes it live; the previous version is kept in **تاریخچه** with «بازگردانی» — the safety net that makes staff comfortable experimenting. The storefront reads the published layout with ISR and revalidates on publish, so the change is live within seconds.

**Default layout** seeded from the current `app/page.tsx`: اسلایدر (2 slides) → دسته‌های منتخب (10 circles from `homeCategories`) → ردیف «کرپ حریر» (material کرپ, 10) → ردیف «لنین‌های جذاب» (material لینن, 10) → کارت ارسال رایگان → مجله (latest 1) → معرفی برند.

### 4.6 فروش فوق‌العاده — Offer page builder

The same builder, scoped to `/offer`, which is empty on the live site today. Seeded with a weekly countdown section (the already-built `CountDown` component counts down to Friday) and a «تخفیف‌دار» product row — which stays hidden until an automatic sale (§4.11) or a product sale price exists, since nothing in the current catalogue is on sale. Whether the «فروش فوق‌العاده» link appears in the menu is controlled in Menu (§4.12), where a shortcut is shown from this page.

### 4.7 مجله — Magazine

List: title, cover, status (منتشرشده / پیش‌نویس / زمان‌بندی‌شده), author, publish date — sorted by date.

Editor: عنوان · نامک (slug, auto from title, Persian allowed, editable) · تصویر شاخص · خلاصه (used on the home teaser and the list; 160 chars counter) · **متن** (block editor: paragraphs, headings, image with caption, quote, embedded product card, embedded product row — so a post about «پارچه مناسب مانتو» can drop the actual fabrics in the middle) · **پارچه‌های مرتبط** (chips linking to materials/patterns/products — today's `related[]`) · دسته‌بندی مجله (e.g. راهنمای خرید، الگو و دوخت، ترند) · برچسب‌ها · نویسنده · تاریخ انتشار (schedule in the future) · سئو (title, description, OG image). Right rail: «پیش‌نمایش», «ذخیره پیش‌نویس», «انتشار».

Magazine categories are managed on a small tab in the same section.

**Two kinds of author.** A post is written either by a person in this editor or by an **AI agent through the Content API** (§7.1). Both produce the same `Post`; the difference is workflow and labelling:

- Every post has an `authorType` (`human` / `agent`) and an author (the user, or the API key's name, e.g. «ربات نویسنده»). The list shows a small «AI» tag on agent posts and can filter by it.
- Agent posts default to the **«نیازمند بازبینی»** status: they never go live until a person with «انتشار» on Magazine opens them, reads them, optionally edits, and publishes. The review screen is the normal editor with a yellow banner («نوشته‌شده توسط ربات نویسنده — پیش از انتشار بازبینی کنید») and a diff against the previous version if the agent updated an existing post. An API key can be granted «انتشار» to skip review for trusted, low-risk content (e.g. a weekly «پارچه‌های تازه» roundup), and that grant is visible on the key.
- Agents can only reference products, materials and media that exist; the API validates embedded product ids and returns errors rather than publishing broken cards. Agents may upload cover images through the API or pick from the media library.
- The storefront can optionally show «این مطلب با کمک هوش مصنوعی تهیه شده» on agent posts (Settings → SEO → «برچسب محتوای هوش مصنوعی», default off).
- Scheduling works the same for both: `publishAt` in the future, and the post goes live on its own.

The editor exposes a «تولید پیش‌نویس با هوش مصنوعی» button for human writers too — it calls the same Content API path with a prompt (topic, target fabrics, length) and drops the result into the editor as a draft. That keeps one implementation for AI content regardless of who triggers it.

### 4.8 صفحات — Pages

The static pages, each with the same block editor as posts plus page-specific fields:

- **درباره ما** — title, hero image, history paragraph, the differentiators list (ارسال رایگان، پرداخت امن، …) as editable items with icons, and a toggle for the category circles strip.
- **تماس با ما** — currently empty on the live site. Renders the store's contact details from Settings → Store (phone, Telegram, Instagram, email, address, working hours — one source, not duplicated here), plus page-specific: an intro text, a map embed (Neshan/Balad iframe), and a contact form toggle (submissions land in Reviews & Messages, §4.10).
- **راهنمای خرید متراژ** — the global buying-guide popup content (lorem ipsum in the old theme). Rich text + an optional table of «برای مانتو حدود ۲٫۵ متر با عرض ۱۵۰».
- **سوالات متداول**, **قوانین و شرایط**, **حریم خصوصی**, **گارانتی ۷ روزه** — plain rich-text pages linked from the footer.
- **صفحه جدید** — arbitrary page with slug, for campaigns.

Each page: status, SEO fields, «مشاهده در سایت».

### 4.9 مشتریان — Customers

Every phone number that has ever verified an OTP is a customer record.

List: name, phone, city, orders count, total spent, last order, wallet balance, tag (e.g. «خیاط», «عمده»). Search by phone/name. Filter: has ordered / never ordered / blocked / has wallet balance. Export CSV.

Detail: profile (name, national code, referral source «معرف»), **آدرس‌ها** (the saved address book with the default marked — editable here in case a customer phones in), **سفارش‌ها**, **علاقه‌مندی‌ها** (their wishlist — useful for «the crepe you liked is on sale» outreach), **کیف پول** (balance, history, «افزایش / کاهش اعتبار» with reason — used for refunds and goodwill credit; the storefront's «My Wallet» becomes real), **یادداشت‌ها** (internal), **پیامک** (send a template SMS), **مسدودکردن** (owner; blocks checkout with a polite message).

### 4.10 دیدگاه‌ها و پیام‌ها — Reviews & messages

Tabs: **دیدگاه‌ها** (product reviews with star rating), **پرسش‌ها** (product questions), **پیام‌های تماس** (contact-form submissions).

Moderation queue: pending first; each item shows the product, the customer (verified-purchase badge when they bought it), rating, text; actions **تایید · رد · پاسخ** (a reply is published under the review with the store's name). Settings: auto-approve reviews from verified purchasers (off by default), review request SMS after delivery (on/off, delay in days). The storefront's «Reviews (۰)» tab becomes real: average rating and count replace the static `rating` field.

### 4.11 بازاریابی — Marketing

Everything needed to run promotions from the back office without a developer. One section, seven tabs: **تخفیف‌ها · کدهای تخفیف · تخفیف ارسال · کمپین‌ها · بخش‌بندی مشتریان · پیامک انبوه · گزارش‌ها**, plus **معرفی دوستان** under Discounts.

#### 4.11.1 تخفیف‌ها — Product discounts

All the common ways to discount, as one list of **قوانین تخفیف** (discount rules). Each rule has a name, a schedule (from / until, or open-ended), a status, a priority, and a **stacking** setting («با تخفیف‌های دیگر جمع می‌شود» / «فقط بزرگ‌ترین تخفیف اعمال شود», default: largest wins, coupons stack on top). Types:

| Type | Persian | What it does | Typical use |
|---|---|---|---|
| Sale price | قیمت فروش ویژه | per-product sale price with schedule (edited on the product, listed here too) | one fabric on sale |
| Percentage / fixed off a scope | تخفیف روی گروه | e.g. 15 % off all کرپ, or 50,000 Toman off every product in family X; scope = all / material / pattern / usage / family / tag / selected products | seasonal sale, clearance of a material |
| Volume tiers | تخفیف پلکانی متراژ | buy ≥ 3 m → 5 %, ≥ 5 m → 10 %, ≥ 10 m → 15 % — per line or across the cart for the same scope; for عددی products the tiers are in pieces | reward tailors buying bolts |
| Cart total tiers | تخفیف پلکانی سبد | cart ≥ 1,000,000 → 5 %, ≥ 2,000,000 → 10 % | raise average basket |
| Buy X get Y | بخر و بگیر | buy N metres of scope A, get M metres of scope B at Z % off (or free) | move slow stock with popular stock |
| Customer-group price | قیمت گروهی | a percentage or fixed price list for customers with a tag (خیاط, عمده, VIP) — shown to them when signed in | trade pricing |
| First order | خرید اول | X % off a customer's first paid order, optionally capped | acquisition |
| Flash sale | فروش لحظه‌ای | a scope discount with a short window and a countdown; auto-adds a Countdown section to the offer page | weekend sale |
| Cashback to wallet | بازگشت وجه به کیف پول | X % of the paid amount credited after delivery | retention |
| Bundle price | باندل | fixed price for a defined set (e.g. لینن + آستر + نخ) | kits |

Each rule shows on the storefront as the strike-through price with a «٪» badge (already the card's style), a line on the product page explaining the tier («۳ متر بخرید، ۵٪ تخفیف بگیرید»), and a discount line in the cart. A **«شبیه‌ساز قیمت»** on the rule page lets staff pick a product, a quantity and a customer tag and see exactly what the storefront will charge — the fastest way to catch a rule that stacks wrongly. Rules record which orders used them, feeding the reports.

#### 4.11.2 کدهای تخفیف — Coupons

Code (auto-generate or type; case-insensitive; Persian/Latin; bulk-generate N unique codes for SMS campaigns) · effect: درصدی / مبلغ ثابت / ارسال رایگان / a specific discount rule · مقدار · حداکثر تخفیف (for percent) · حداقل مبلغ or حداقل متراژ سبد · محدوده (all / material / pattern / family / selected products / excluded on-sale items) · who: everyone / customer segment (§4.11.5) / a list of phones / first order only · یک‌بار برای هر مشتری · سقف استفاده کل · بازه اعتبار · combinable with automatic discounts yes/no · وضعیت. The list shows uses / cap, revenue attributed, and a «کپی کد» button. The storefront cart's coupon box validates against this (today it rejects everything) and explains failures in plain words («این کد فقط برای خرید اول است»). Coupons are also attachable to a campaign and to a shareable URL (`/?coupon=NOWRUZ` pre-fills the cart).

#### 4.11.3 تخفیف ارسال — Shipping discounts

Shipping is priced by the **rules engine in Settings → Delivery** (§4.14); this tab holds the discount side of it, written in the same condition language so the two read alike:

- **ارسال رایگان از مبلغ** — threshold (Toman) and provinces; the storefront's free-shipping card and cart message («۲۰۰٬۰۰۰ تومان تا ارسال رایگان») follow it.
- **ارسال رایگان از متراژ** — e.g. ≥ 5 m in the cart.
- **ارسال رایگان برای گروه / محصول** — a material, family, tag or selected products ship free.
- **ارسال رایگان برای بخش مشتریان** — VIP tag, first order, a segment.
- **درصد / مبلغ تخفیف روی ارسال** — e.g. 50 % off shipping for تهران during a campaign.
- **کد تخفیف ارسال** — a coupon whose effect is on the shipping line.

Rules have schedule, priority and stacking like product discounts. The cart always shows the shipping line as «ارسال: ۴۵٬۰۰۰ ← رایگان» so the customer sees what they got.

#### 4.11.4 کمپین‌ها — Campaigns

A campaign is the folder that ties a promotion together so it can be launched and stopped as one thing: name, dates, goal note, and any of — a landing page (a layout built with the offer/home builder, at `/campaign/[slug]` or replacing `/offer`), discount rules, coupons, shipping discounts, a home-page banner or hero slide (scheduled automatically to the campaign dates), an announcement bar text, and an SMS send. «راه‌اندازی» activates everything on the start date; «توقف» ends it early. The campaign page shows live numbers: orders, revenue, coupon uses, SMS delivered, and links with UTM parameters generated for Instagram, Telegram and SMS so traffic is attributable.

#### 4.11.5 بخش‌بندی مشتریان — Segments

Saved filters over customers, evaluated live: bought material X · bought in the last N days / not in N days · total spent ≥ · order count ≥ · province / city · has wishlist items in scope · has wallet balance · tag · joined via referral · abandoned a cart in the last N days (needs the server-side cart, Phase 3). A segment shows its current size and is used by coupons, shipping discounts, customer-group prices and SMS campaigns. Built-in segments: «مشتریان جدید», «مشتریان وفادار» (≥ 3 orders), «غیرفعال ۹۰ روز», «خیاط‌ها» (tag).

#### 4.11.6 پیامک انبوه — SMS campaigns

Mass SMS is composed and sent from the **پیامک** section (§4.16 → پیامک انبوه). A campaign (§4.11.4) can attach a mass SMS so it launches and reports with the rest of the campaign; the send itself, the segment picker, cost preview, opt-out handling and delivery log are all in one place there.

#### 4.11.7 معرفی دوستان — Referral

Each customer can have a personal code (shown in their account). New customer uses it at checkout → both get a reward defined here (percentage / fixed / wallet credit), with caps and a first-order-only rule. The storefront's existing «معرف» field is where the code is entered. Reports show top referrers.

#### 4.11.8 گزارش‌ها — Reports

Sales by day/week/month, by material, by province, by delivery method; discount and coupon performance (uses, revenue, average discount); campaign summaries; refunds by reason; best sellers by metres; customers new vs returning; abandoned carts. Every report has a date range, a chart and a CSV export. These are the numbers the dashboard tiles summarise.

### 4.12 منو و فوتر — Navigation

**منوی اصلی:** ordered list of items (label, link, open in new tab); the storefront's «دسته‌بندی» mega-menu item is special: for each of the three taxonomies choose **auto (top n by product count)** or **manual** (pick values and order — this uses the order from §4.4), and how many to show (desktop currently 8, mobile 14). A «همه محصولات» link toggle.

**فوتر:** the «درباره مدیلیش» boilerplate paragraph, quick links (label + link, ordered), support line (Telegram handle + URL), enamad embed code, copyright line, social links, footer logo.

**هدر:** header logo, search placeholder text, announcement bar (optional one-line message with link and colour, e.g. «ارسال رایگان تا پایان هفته»).

### 4.13 رسانه — Media library

Grid of uploads with search, filter by type/usage («استفاده‌نشده» to clean up), folder-less but taggable. Upload from anywhere in the admin opens the same picker. Each file: alt text, dimensions, size, where it is used (products, sections, posts). Images are stored on S3-compatible object storage (Arvan / Liara / Hamravesh — Iran-hosted so image loads are not blocked or slow) and served through `next/image` with WebP/AVIF variants.

### 4.14 تنظیمات — Settings

Tabs:

- **فروشگاه** — نام, نام حقوقی (پرنا تجارت پارسیان), لوگو (header / footer / favicon / OG default), تلفن, تلگرام, اینستاگرام, ایمیل, **آدرس فروشگاه** (used for in-store pickup and the contact page — replaces the lorem ipsum in `AddressClient.tsx`), ساعات کاری, کد enamad, متن کپی‌رایت.
- **ارسال و تحویل** — **روش‌های ارسال** (پست پیشتاز / تیپاکس / پیک تهران / … — name, ETA text, on/off, order; each method has a **base price** and then the **rules engine** below adjusts it). **کلاس‌های ارسال** (سبک / معمولی / حجیم / سنگین) that products are assigned to. **تحویل حضوری** on/off, «پرداخت در محل» for pickup, closed weekdays (default: جمعه — today hard-coded in `iran.ts`), holidays (Jalali date picker; the pickup-day list skips them), time slots (editable list — today «۹ تا ۱۲» … hard-coded), capacity per slot (optional), how many days ahead (default 7), same-day pickup on/off with a cut-off hour (default off, matching today's "from tomorrow"); provinces served (checkbox list of the 31 provinces), default province for the address form (default تهران). **The customer picks one of the active methods at the address step and sees its computed fee; the cart and checkout totals include it** (today the storefront has no fee line at all).

  **قوانین هزینه ارسال — the shipping rules engine.** Shipping cost is modular: an ordered list of rules, each `if <conditions> then <action>`, evaluated per method for the cart in hand. Conditions can be combined with «و»: total metres in the cart (≥ / ≤ / between) · total pieces · cart total (Toman) · total weight (from «وزن هر متر» × metres) · contains a shipping class / material / family / tag / specific product · province or city · delivery method · customer segment or tag · date range. Actions: set price to X · add X · add X per metre above N · add X per kg · multiply by % · «این روش در دسترس نیست» (hide the method — e.g. no courier outside تهران, no post for حجیم) · «رایگان». Evaluation: rules run top to bottom; «توقف پس از اعمال» on a rule ends evaluation, otherwise effects accumulate; then Marketing → shipping discounts (§4.11.3) apply on top. A **«محاسبه‌گر»** panel on the page takes a sample cart (province, lines) and shows the resulting price per method with the rules that fired, so the owner can test a change before saving. Examples the seed ships with: «پست پیشتاز: پایه ۴۵٬۰۰۰ + ۵٬۰۰۰ به‌ازای هر متر بالای ۳ متر», «پیک تهران فقط در استان تهران», «کلاس حجیم: +۳۰٬۰۰۰», «سبد بالای ۱٬۵۰۰٬۰۰۰: رایگان».
- **پرداخت — زرین‌پال** — the gateway is Zarinpal; the tab is built for it rather than generic: **Merchant ID** (the 36-character UUID from the Zarinpal panel, e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`), **حالت آزمایشی (sandbox)** toggle, **آدرس بازگشت (callback URL)** shown read-only with a copy button — this is what you paste into the Zarinpal panel: `https://modilish.com/api/payment/callback/zarinpal` — **واحد پول** (Zarinpal accepts `IRR` or `IRT`; we send `IRT` so amounts match the Toman prices), **زرین‌گیت** on/off (direct-to-bank page), **توضیح پرداخت** template shown on the gateway («سفارش {number} — مدیلیش»), **بازپرداخت از طریق درگاه** on/off (requires the refund scope on the merchant; needs a Zarinpal access token pasted in Integrations), «**تست اتصال**» (creates and immediately cancels a 1,000 Toman sandbox request and reports the result), and a live list of the last 20 gateway calls with authority, status and error codes. Also: wallet payments on/off, «پرداخت در محل» (pickup only), «کارت‌به‌کارت» for manual orders on/off, order expiry for unpaid orders (default 24 h; releases the stock reservation), and a **ثبت پرداخت دستی** permission note.
- **کاتالوگ و نمایش** — everything about how listings behave, all hard-coded today in `CatalogGrid.tsx`, `ProductDetail.tsx` and `taxonomy.ts`: products per page (default 16), enabled sort options and the default (گرانترین / ارزان‌ترین / محبوب‌ترین / جدیدترین — «محبوب‌ترین» is defined as metres sold in the last 90 days, so it works from Phase 1 without reviews), number of filter chips per dimension (default 12), رنگبندی rail length (default 8), related-products count (default 10), out-of-stock products: show with badge / hide, show remaining stock to customers on the product page on/off (today «موجودی : ۱۰ متر» is always shown), searchable fields (name, SKU, جنس دقیق, patterns, colours, description — today only name, family and patterns), and one search entry point (`/search?s=`; `/shop?q=` and the legacy `?cat=` keep working as redirects).
- **پیامک** — moved to its own section, **پیامک** (§4.16); this tab is a link to it. The Kavenegar key lives in Integrations.
- **سئو** — site title template («%s | مدیلیش»), default description, default OG image, robots (noindex for staging), sitemap on/off, Google Search Console verification tag, analytics snippet; **عناوین صفحات سیستمی** — title and description for the pages that have no editor of their own: home (today «مدیلیش | فروشگاه پارچه»), shop, search, cart, address, checkout, my-account, 404, and the material-page title template (today «خرید پارچه %s در رنگ‌های مختلف | مدیلیش»).
- **متن‌ها** — the site's fixed microcopy in one searchable list with defaults and «بازگردانی به پیش‌فرض»: menu label template («خرید پارچه %s»), «دسته‌بندی», «همه محصولات», row link «مشاهده همه», hero button «مشاهده رنگ‌ها», product button «ثبت سفارش», footer headings, cart texts (the cart's «has been added to your cart» / «View cart» / «Coupon code» and the product page's «Description» / «Reviews» are English today and get Persian defaults), validation messages («حداقل متراژ قابل سفارش …», «مقادیر ستاره‌دار باید پر شوند»), 404 texts, empty-cart text. Storefront validation rules are fixed and documented here rather than editable: mobile 11 digits, postcode 10 digits, national code 10 digits with checksum (optional field), required fields as today.
- **کاربران و دسترسی‌ها** — the two tabs described in §2.1: **کاربران** (invite by phone, assign a role, deactivate, «خروج از همه دستگاه‌ها»; the last مالک cannot be demoted) and **نقش‌ها** (the permission grid — areas as rows, مشاهده / ویرایش / انتشار / حذف as columns plus the area-specific switches; «ایجاد نقش», «کپی نقش»; a role in use cannot be deleted). Third tab **کلیدهای API**: name, role, expiry, «ایجاد» shows the key once, revoke, last used, calls in the last 24 h.
- **اتصال‌ها (Integrations)** — every external key in one place, each as a labelled field with the expected format as placeholder, a «کجا پیدایش کنم؟» hint, write-only display («●●●●۴۲») once saved, and a «تست» button where a test is possible. Only مالک sees this tab.

  | Service | Field | Placeholder / format | Used for |
  |---|---|---|---|
  | زرین‌پال | Merchant ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | payments |
  | زرین‌پال | Access token (optional) | `eyJ…` long JWT from the Zarinpal panel | refunds through the gateway |
  | کاوه‌نگار | API key | 64+ hex characters | OTP, order SMS, campaigns |
  | کاوه‌نگار | شماره فرستنده | `1000…` / `2000…` | promotional SMS sender line |
  | کاوه‌نگار | نام الگوها | `verify`, `order-paid`, `order-shipped`, … one per event | VerifyLookup templates |
  | فضای ذخیره‌سازی (S3-compatible: آروان / لیارا / هم‌روش) | Endpoint · Bucket · Access key · Secret key · CDN base URL | `https://s3.ir-thr-at1.arvanstorage.ir` · `modilish-media` · … | images, video uploads, imports, backups |
  | تلگرام (اختیاری) | Bot token · Chat ID | `123456789:AA…` · `-100…` | pushes new-order / low-stock alerts to a Telegram chat as well as in-app |
  | نشان / بلد (اختیاری) | Map API key | … | map on the contact page |
  | Google Search Console | Verification tag | `<meta name="google-site-verification" …>` | SEO |
  | آنالیتیکس (اختیاری) | Snippet | GA4 `G-…` id or a full script tag | traffic |
  | Content API | — | keys are issued under کاربران و دسترسی‌ها → کلیدهای API | AI writer, future app |

  Keys are stored encrypted at rest and never returned by any API; the audit log records when a key was changed, not its value.
- **گزارش فعالیت (Audit log)** — filterable by user, section, action, date; each row shows before/after for edits; export.
- **پشتیبان‌گیری** — download a full JSON/CSV export of products, orders, customers, pages; last automatic backup time.

### 4.15 اعلان‌ها — Notifications

The bell in the top bar. Events: سفارش جدید پرداخت‌شده, پرداخت ناموفق, موجودی کم, دیدگاه جدید, پرسش جدید, پیام تماس, درون‌ریزی تمام شد, خطای پیامک / درگاه. Each user chooses per event: in-app only, plus SMS, plus web push (PWA install prompt is offered once on mobile so the owner gets order pushes on the phone). Mark all read; click-through to the item.

---

### 4.16 پیامک — SMS

Every text message the shop sends — the code at sign-in, «سفارش شما ارسال شد», a Friday-sale blast to 800 customers — is written, switched on or off, sent and audited here. Nothing about SMS is in code. Kavenegar is the carrier; this section is the control panel in front of it.

Five tabs: **پیامک‌های خودکار · پیامک انبوه · ارسال تکی · گزارش ارسال · تنظیمات پیامک**. The section badge shows failed sends in the last 24 h and a warning when the Kavenegar credit is below the threshold.

#### 4.16.1 پیامک‌های خودکار — Automatic messages

One row per event the system can message about. Each row: on/off switch · the message text with variables · delay (send immediately, or N hours/days after the event) · a **پیش‌نمایش** rendered with a real recent order so the owner sees exactly what a customer would get · «ارسال آزمایشی به خودم» · last sent time and 30-day count. Editing the text is a plain textarea with a variable picker («{name}», «{order}», «{amount}», «{tracking}», «{carrier}», «{day}», «{hour}», «{code}», «{link}», «{coupon}») and a live character/segment counter (Persian SMS is 70 characters per segment; the counter shows «۲ بخش» so a long template does not silently double the cost).

Events shipped, with default Persian text:

| Event | Sent to | Default (editable) | Default delay |
|---|---|---|---|
| کد تایید (OTP) | anyone signing in | کد ورود شما به مدیلیش: {code} | immediate; cannot be switched off |
| ثبت سفارش (paid) | customer | سفارش {order} ثبت شد. به‌زودی آماده می‌شود. مدیلیش | immediate |
| در حال آماده‌سازی | customer | — (off by default) | — |
| ارسال شد | customer | سفارش {order} با {carrier} ارسال شد. کد رهگیری: {tracking} | immediate |
| آماده تحویل حضوری | customer | سفارش {order} آماده تحویل است. {day} ساعت {hour} منتظرتان هستیم. | immediate |
| تحویل شد | customer | سفارش {order} تحویل شد. از خرید شما متشکریم. | immediate |
| درخواست نظر | customer | نظرتان درباره پارچه‌ای که خریدید را در {link} ثبت کنید. | 3 days after delivered |
| لغو / بازپرداخت | customer | سفارش {order} لغو شد. مبلغ {amount} به {method} برگشت داده شد. | immediate |
| مرجوعی: تایید / رد / دریافت / بازپرداخت | customer | one template per step | immediate |
| شارژ کیف پول | customer | {amount} تومان به کیف پول شما اضافه شد. | immediate |
| سفارش پرداخت‌نشده | customer | سفارش {order} منتظر پرداخت است: {link} | 2 h after creation (Phase 3) |
| سبد رهاشده | customer | سبد خرید شما منتظر است: {link} | 24 h (Phase 3) |
| موجود شد (wishlist) | customer | «{product}» که پسندیده بودید دوباره موجود شد. | when stock goes 0 → >0 (Phase 3) |
| لینک پرداخت (manual order) | customer | برای پرداخت سفارش {order} به {link} بروید. | immediate |
| **هشدار مدیر: سفارش جدید** | admin phones | سفارش جدید {order} به مبلغ {amount} از {name} | immediate |
| **هشدار مدیر: موجودی کم** | admin phones | «{product}» به {stock} متر رسید. | daily digest at 09:00 |
| **هشدار مدیر: خطای درگاه / پیامک** | admin phones | — | immediate |

Templates whose text changes must be re-registered with Kavenegar (VerifyLookup requires pre-approved templates). The admin handles this without the owner leaving the page: saving a template stores it as «در انتظار تایید کاوه‌نگار», a button submits it to the Kavenegar template panel (or shows the exact text to paste there), and the row turns green when the template name is confirmed. Until then the previous approved text keeps sending, so a typo never silences order confirmations.

#### 4.16.2 پیامک انبوه — Mass SMS

The «send to a group» screen, used on its own or from a campaign.

1. **گیرندگان** — pick a customer **segment** (§4.11.5), or «همه مشتریان», or upload a phone list (CSV / paste), or select customers by hand. The count updates live and shows how many are excluded by opt-out or blacklist.
2. **متن** — the same editor as above, with personalisation variables and «درج کد تخفیف» that either inserts one shared code or generates a unique single-use coupon per recipient (bulk-created in Marketing → Coupons and attributed back to this send). Segment counter and cost estimate (recipients × segments × Kavenegar tariff) are always visible. Mandatory opt-out footer for promotional text (configurable, e.g. «لغو۱۱»).
3. **زمان ارسال** — now, or scheduled (Jalali date + time); sends are throttled to the carrier's rate and never fall inside quiet hours unless the owner overrides.
4. **پیش‌نمایش و تست** — rendered for three sample recipients; «ارسال آزمایشی به خودم».
5. **ارسال** — needs the «پیامک انبوه» permission; above a configurable recipient count (default 500) a second person must approve, the same pattern as large refunds.

After sending, the mass SMS page shows delivered / failed / pending with reasons (blacklisted, invalid number, no credit), cost, and — when a coupon was included — uses and revenue. «ارسال مجدد به ناموفق‌ها» retries only the failed ones. Every mass SMS is stored so it can be duplicated for the next campaign.

#### 4.16.3 ارسال تکی — Single send

Search a customer or order, pick a template or write free text, send. Also reachable from the customer page and the order page (§4.2.2), so staff answering a phone call can text a customer without leaving the order. Free-text sends use the service line and are logged on the customer and, if chosen, on the order timeline.

#### 4.16.4 گزارش ارسال — Sent log

Every message ever sent, one row each: time, recipient (linked to the customer), type (خودکار / انبوه / تکی / OTP), template or campaign, text as sent, status from Kavenegar (delivered, pending, failed + reason), cost, message id. Filters by type, status, date, customer; export CSV; «ارسال مجدد» on a failed row. A daily and monthly cost total sits at the top, next to the current Kavenegar credit.

#### 4.16.5 تنظیمات پیامک — SMS settings

- **خطوط ارسال** — the **service line** (خط خدماتی, for OTP and order messages; delivers to blacklisted numbers too) and the **promotional line** (خط تبلیغاتی, for mass sends; filtered by the national blacklist). Both are Kavenegar sender numbers; the API key itself lives in Integrations.
- **اعتبار** — live Kavenegar credit, a low-credit threshold that triggers an admin alert, and a link to top up.
- **ساعت سکوت** — no promotional or non-urgent automatic sends between 22:00 and 08:00 (OTP and payment links are exempt); editable.
- **سقف روزانه** — maximum automatic + mass sends per day, as a safety net against a bug or a runaway campaign.
- **OTP** — code length 6, expiry 5 min, resend 120 s, per-number hourly cap 3, lock after 5 wrong attempts.
- **لغو دریافت** — the opt-out footer text, the reply keyword that opts a number out, and the opt-out list itself (searchable, with manual add/remove and the reason). Customers can also opt out from their account; the storefront collects promotional consent at first OTP.
- **گیرندگان هشدار مدیر** — the admin phone numbers that receive new-order, low-stock and failure alerts, per alert type; also the Telegram chat if configured.
- **امضا** — the store name appended to automatic messages («مدیلیش»).

## 5. Cross-cutting UX rules

- **Lists**: server-side pagination (25/50/100), sticky header, column sort, remembered filters per user, «کپی» on any id/phone, keyboard navigation (↑↓ Enter), row hover in `modi-purple-200`.
- **Forms**: labels above inputs, required marked with the storefront's red asterisk (`label.require`), inline validation on blur, error summary on submit, Persian/Latin digit normalisation, thousands separators on money, Jalali date picker with a «امروز» button, autosave drafts every 5 s for editors, «Ctrl+S» saves.
- **Feedback**: toasts bottom-right (desktop) / above the bottom bar (mobile), 4 s, with «بازگردانی» when applicable; optimistic updates for status changes with rollback on failure.
- **Destructive actions**: a confirm sheet that names the object («سفارش ۱۲۴۰ لغو شود؟») with the consequence («موجودی به انبار برمی‌گردد و پیامک لغو ارسال می‌شود»); 10-second undo where the action is reversible.
- **Empty states**: illustration in the storefront style, one sentence, one primary action.
- **Loading**: skeletons that match the final layout; never a spinner over a blank page.
- **Accessibility**: focus rings (`modi-purple-500`), all icon buttons labelled, contrast ≥ 4.5:1 on both themes, `prefers-reduced-motion` respected, tables with proper headers.
- **Dark mode**: supported via the same token set; the owner's phone at night will thank us.
- **Search**: Persian normalisation (ي→ی, ك→ک, ZWNJ-insensitive, digit-insensitive) applied to every search box and the storefront's too.
- **Responsiveness**: sidebar → bottom tabs at < 1024 px (the storefront's own breakpoint), tables → cards, two-column editors → one column, sticky action bar.

---

## 6. Data model

Postgres via Prisma. Money in integer Toman. Quantities are integers in the product's **minor unit**: centimetres for `meter` products (2.30 m is `230`, avoiding floating-point cuts) and pieces for `piece` products. A line total is `round(unitPriceToman × quantity / 100)` for metres and `unitPriceToman × quantity` for pieces — the same result as the storefront's `Math.round(unitPrice * qty)` today. Timestamps in UTC, rendered Jalali. Product ids are preserved from the WooCommerce export.

```
AdminUser        id, phone (unique), name, roleId, active, lastLoginAt, createdAt
Role             id, name, isOwner, permissions (json: { area: { view, edit, publish, delete, extras{} } })
ApiKey           id, name, roleId, keyHash, prefix (mdl_live_…), expiresAt?, lastUsedAt?, revokedAt?, createdBy
AdminSession     id, userId, expiresAt, userAgent, ip
CustomerSession  id, customerId, expiresAt, userAgent, ip
OtpChallenge     id, phone, codeHash, expiresAt, attempts, purpose (admin|customer)

Product          id (kept from Woo), sku (unique → slug), name, status (published|draft|hidden), unit (meter|piece),
                 priceToman, salePriceToman?, saleFrom?, saleUntil?, stockQty, minOrderQty, maxOrderQty?,
                 lowStockQty, widthCm?, weightPerMeterG?, materialId (family), materialDetail? (جنس دقیق),
                 stanceId?, familyId? (رنگ‌بندی), videoUrl?, guideOverride?, description (rich), internalNote?,
                 seoTitle?, seoDescription?, createdAt, updatedAt, createdBy, updatedBy
ProductImage     id, productId, mediaId, alt, position
ProductVideo     id, productId, kind (upload|aparat|youtube|url), mediaId? | url, title, posterMediaId?, showInGallery, position
ShippingClass    id, name, position                                  (سبک / معمولی / حجیم / سنگین)
ProductPattern   productId, patternId              (m:n)
ProductUsage     productId, usageId                (m:n)
ProductSeason    productId, seasonId               (m:n)
ProductColor     productId, colorId                (m:n)
ProductRelated   productId, relatedId, position    (manual override)
Family           id, name, slug                    (رنگ‌بندی group)
AttributeValue   id, type (material|pattern|usage|stance|color|season), name, slug, position,
                 imageMediaId?, description?, seoTitle?, seoDescription?, showInMenu, hex? (colours)
StockMovement    id, productId, deltaQty, reason, orderId?, userId?, note?, balanceAfterQty, createdAt
StockReservation id, productId, orderId, qty, expiresAt            (released on failed/cancel/expiry, consumed on paid)
Redirect         id, fromPath (unique), toPath, createdAt          (auto-written on slug changes; legacy ?cat= etc.)

Customer         id, phone (unique), name?, nationalCode?, referral?, blocked, tags[], walletToman, createdAt
Address          id, customerId, recipient, mobile, landline?, province, city, postcode, line, isDefault
WishlistItem     customerId, productId, createdAt
WalletTx         id, customerId, deltaToman, reason, orderId?, userId?, createdAt

Order            id, number (human, sequential per Jalali year e.g. 1405-000124), customerId, status,
                 paymentStatus (unpaid|paid|cod_pending|refunded|partially_refunded),
                 deliveryMethod (shipping|pickup), shippingMethodId?, addressSnapshot (json), pickupDate?, pickupSlot?,
                 subtotalToman, discountToman, couponCode?, shippingToman, totalToman,
                 paymentGateway?, paymentRef?, paidAt?, carrier?, trackingCode?, shippedAt?, deliveredAt?,
                 customerNote?, referral?, expiresAt, createdAt, updatedAt
OrderLine        id, orderId, productId, nameSnapshot, imageSnapshot, unit, quantity (cm or pieces),
                 unitPriceToman, lineTotalToman, cutNote?
CouponUse        id, couponId, orderId, customerId, createdAt        (enforces oncePerCustomer / usageCap)
OrderEvent       id, orderId, type (status|note|sms|edit|refund|print), fromStatus?, toStatus?,
                 payload (json), userId?, createdAt
Payment          id, orderId, method (zarinpal|wallet|cod|card_to_card|cash), amountToman, authority?, refId?,
                 status, raw (json)?, recordedBy?, createdAt
ReturnRequest    id, orderId, customerId, status (requested|approved|rejected|received|refunded|closed),
                 reason, text?, photos[], lines (json: lineId, quantity), returnMode (customer_ships|pickup|none),
                 decisionBy?, decisionNote?, receivedAt?, restocked, createdAt
Refund           id, orderId, returnRequestId?, amountToman, method (wallet|zarinpal|bank_transfer|replacement),
                 breakdown (json: lines, shipping, goodwill), reason, gatewayStatus?, bankRef?, iban?,
                 requestedBy, approvedBy?, completedAt?, createdAt

DiscountRule     id, name, type (sale|scope|volume_tiers|cart_tiers|buy_x_get_y|group_price|first_order|
                 flash|cashback|bundle), config (json), scope (json), segmentId?, priority, stacking
                 (stack|largest_wins), validFrom?, validUntil?, active, campaignId?
Coupon           id, code (unique, normalised), kind (percent|fixed|free_shipping|rule), value, ruleId?, maxDiscountToman?,
                 minCartToman?, minMeters?, scope (json), audience (json: all|segmentId|phones[]), firstOrderOnly,
                 oncePerCustomer, usageCap?, usedCount, stackable, validFrom?, validUntil?, active, campaignId?
ShippingMethod   id, name, basePriceToman, etaText, active, position
ShippingRule     id, methodId? (null = all), name, conditions (json), action (json), stopAfter, priority, active,
                 validFrom?, validUntil?, kind (cost|discount), campaignId?
Campaign         id, name, slug?, startsAt, endsAt, status, layoutId?, announcementText?, utm (json), notes?
Segment          id, name, definition (json), builtIn
SmsTemplate      id, event (unique), enabled, text, delayMinutes, kavenegarTemplate?, approvalStatus, updatedBy, updatedAt
SmsCampaign      id, name, audience (json: segmentId|phones[]|all), text, couponMode (none|shared|unique), couponId?,
                 scheduledAt?, sentAt?, recipients, excluded, delivered, failed, costToman, status, campaignId?, approvedBy?
SmsMessage       id, customerId?, phone, kind (otp|auto|mass|single|admin_alert), templateId?, smsCampaignId?, orderId?,
                 text, line (service|promo), status (queued|sent|delivered|failed), failReason?, providerId?, costToman?,
                 sentBy?, createdAt, deliveredAt?
SmsOptOut        phone (unique), customerId?, source (reply|account|manual), reason?, optedOutAt
ReferralCode     id, customerId, code (unique), rewardConfig (json), uses

Layout           id, key (home|offer), draft (json), published (json), publishedAt?, publishedBy?
LayoutVersion    id, layoutId, snapshot (json), createdAt, createdBy, label?
Menu             id, key (main|footer_quick|footer_social), items (json)
SiteSettings     key, value (json)      — store, delivery, payment, catalogue, sms, seo, header, footer, strings

Post             id, slug (unique), title, excerpt, coverMediaId?, body (blocks json), categoryId?,
                 tags[], authorType (human|agent), authorId? | apiKeyId?, status (draft|review|scheduled|published), publishAt?, seoTitle?, seoDescription?, createdAt, updatedAt
PostCategory     id, name, slug, position
Page             id, slug (unique), title, body (blocks json), fields (json), status, seo…
Review           id, productId, customerId, rating (1–5), text, status (pending|approved|rejected),
                 verifiedPurchase, reply?, repliedBy?, createdAt
Question         id, productId, customerId, text, answer?, status, createdAt
ContactMessage   id, name, phone, text, status (new|read|done), createdAt
Media            id, key, url, mime, width?, height?, bytes, alt?, tags[], uploadedBy, createdAt
Notification     id, userId, type, payload (json), readAt?, createdAt
AuditLog         id, userId, action, entity, entityId, before (json)?, after (json)?, ip, createdAt
```

Layout JSON shape:

```json
{
  "sections": [
    { "id": "s1", "type": "hero", "visible": true, "device": "all",
      "schedule": null, "props": { "slides": [ … ], "intervalMs": 4500 } },
    { "id": "s3", "type": "productRow", "visible": true, "device": "all",
      "props": { "title": "کرپ حریر", "href": "/materials/کرپ",
                 "source": { "kind": "material", "id": 12 }, "limit": 10, "hideOutOfStock": true } }
  ]
}
```

---

## 7. Server surface

Next.js server actions for mutations (typed, colocated with the admin routes) and route handlers for the few things that need URLs:

- `POST /api/payment/callback/[gateway]` — gateway return; verifies, marks `paid`, deducts stock, sends SMS.
- `POST /api/sms/otp` (send) and `/verify` — shared by storefront and admin login, rate-limited.
- `GET /api/admin/export/[entity]` — CSV streams.
- `POST /api/admin/import/products` — upload, returns job id; `GET /api/admin/jobs/[id]` for progress.
- `GET /api/preview?token=…` — enables draft-layout preview on the storefront.
- `POST /api/revalidate` — internal; called after publish to revalidate `home`, `offer`, `product:[sku]`, `material:[slug]`, `post:[slug]` tags.
- `GET /api/admin/events` — SSE stream for live orders and notifications.

Every action: authenticate session → authorise role → validate input (zod) → write in a transaction → append `AuditLog` → revalidate affected tags.

### 7.1 Content API (for AI agents and other non-human authors)

A small, stable REST surface under `/api/v1/`, authenticated with an API key from Settings → Users & access (`Authorization: Bearer mdl_live_…`). The key's role bounds every call exactly as it would a person; a «نویسنده» key cannot touch products or orders. JSON in, JSON out, UTF-8, Persian slugs allowed, all errors in the form `{ "error": { "code": "…", "message": "…", "field": "…" } }`. Rate limit 60 requests/minute per key. OpenAPI document served at `/api/v1/openapi.json` so an agent can read the contract itself.

| Method & path | Purpose |
|---|---|
| `GET /api/v1/me` | who am I, which role, which permissions — lets an agent check before acting |
| `GET /api/v1/products?q=&material=&limit=` · `GET /api/v1/products/{sku}` | read-only catalogue for embedding real fabrics and linking correctly |
| `GET /api/v1/attributes/{type}` | material / pattern / usage values with slugs |
| `GET /api/v1/posts?status=&author=` · `GET /api/v1/posts/{id}` | list and read posts, including drafts the key owns |
| `POST /api/v1/posts` | create a post — body below; lands as `review` unless the key has publish |
| `PATCH /api/v1/posts/{id}` | update title, body, excerpt, cover, tags, related, `publishAt` |
| `POST /api/v1/posts/{id}/submit` | move a draft to «نیازمند بازبینی» |
| `POST /api/v1/posts/{id}/publish` | publish now or at `publishAt` — only with the publish permission |
| `POST /api/v1/media` (multipart) | upload an image; returns `mediaId` and URL |
| `GET /api/v1/media?q=` | search the library |
| `POST /api/v1/ai/draft` | ask the server-side model for a draft (`{ topic, materials[], length, tone }`) — same path the editor's button uses |
| `GET /api/v1/webhooks` · `POST /api/v1/webhooks` | subscribe a URL to `post.published`, `post.review_requested`, `order.paid`, `stock.low` (signed with an HMAC secret) |

Post body (create/update):

```json
{
  "title": "پارچه مناسب مانتوی پاییزی",
  "slug": "پارچه-مانتو-پاییز",
  "excerpt": "راهنمای انتخاب کتان، کرپ و مخمل برای مانتوی پاییز.",
  "cover": { "mediaId": 812 },
  "category": "راهنمای-خرید",
  "tags": ["مانتو", "پاییز"],
  "body": [
    { "type": "paragraph", "text": "…" },
    { "type": "heading", "level": 2, "text": "کتان گاباردین" },
    { "type": "image", "mediaId": 813, "caption": "…" },
    { "type": "product", "sku": "1312" },
    { "type": "productRow", "title": "کتان‌های پیشنهادی", "source": { "kind": "material", "slug": "کتان" }, "limit": 6 },
    { "type": "quote", "text": "…" }
  ],
  "related": [ { "kind": "material", "slug": "کتان" }, { "kind": "product", "sku": "1312" } ],
  "seo": { "title": "…", "description": "…" },
  "publishAt": "2026-09-10T06:30:00Z"
}
```

Validation rejects unknown SKUs, slugs and media ids, bodies over 20,000 characters, and more than 30 blocks, with the offending field named — so an agent can correct and retry instead of publishing something broken. Agent-created posts are marked `authorType: "agent"` and go through the review path described in §4.7.

---

## 8. Storefront changes this implies

The admin is only useful if the storefront reads from it. Hard-coded today → after:

| Today (file) | After |
|---|---|
| `lib/catalog.ts` static array | `Product` table; product/material/shop pages fetch with `unstable_cache` + tags; `generateStaticParams` from DB |
| `lib/products.ts` `categories`, `lib/taxonomy.ts` tallies & `collections` | `AttributeValue` with explicit order; counts computed |
| `lib/homeCategories.ts` list + `categoryImage()` guess | Circles section of the published home layout; images from attribute/media |
| `components/HeroSlider.tsx` `slides[]` | Hero section props |
| `app/page.tsx` literal rows, free-shipping card, magazine teaser, brand block | Rendered from `Layout.published.sections` by a `SectionRenderer` |
| `app/offer/page.tsx` empty; `CountDown` unused | Offer layout; countdown section uses `CountDown` |
| `lib/content.ts` `brand` object | `SiteSettings` (store/footer/header) |
| `lib/content.ts` `articles[]` | `Post` table; `/magazine` lists published posts |
| `app/about-us`, `app/contact-us` static/empty | `Page` records with block renderer |
| `Header.tsx` menu items and `slice(0, 8)` / `slice(0, 14)`, logo, «خرید پارچه %s» label | `Menu` config + attribute `showInMenu`/`position`; header settings; optional announcement bar (new) |
| `Footer.tsx` headings, links, Telegram, enamad, copyright, logo | Footer settings; social links (new) |
| `CatalogGrid.tsx` `PAGE_SIZE = 16`, sort list, `slice(0, 12)` chips, «محبوب‌ترین» by static `rating` | Catalogue settings; popularity from 90-day metres sold |
| `lib/iran.ts` states, Friday rule, hour slots, "from tomorrow" | Delivery settings; the address page fetches available pickup days/slots |
| `AddressClient.tsx` lorem-ipsum store address; no persistence; only ارسال/حضوری; default province `iranStates[7]`; no fee | Store address from settings; addresses saved to `Address`; address book picker; **shipping method picker with fee**, order note, optional «معرف», COD option for pickup; default province from settings |
| `lib/cart.tsx` total = sum of lines | Cart summary shows shipping fee and discount lines; optional per-line «توضیح برش» |
| `PhoneGate.tsx` fake OTP, 10-digit phone, 4-digit code | Real Kavenegar OTP; 11-digit normalised phone; 6-digit code; customer session |
| `app/checkout/page.tsx` placeholder | Creates `Order` (`pending_payment`) with stock reservation, redirects to gateway, callback → `paid` |
| `lib/cart.tsx` localStorage only | Keep localStorage for guests (ids preserved by the import); merge into server cart on login so the admin can see abandoned carts (v2) |
| `lib/wishlist.tsx` with no «add» entry point; editable list name | Heart button on `ProductCard` and `ProductDetail`; synced to `WishlistItem` on login; the list-name editor is dropped |
| `ProductDetail.tsx` «Reviews (۰)» static, `rating` field | Real reviews and questions; average from approved reviews |
| `ProductDetail.tsx` guide/video buttons do nothing | Guide popup content from Pages; Aparat embed when `videoUrl` set |
| `ProductDetail.tsx` metre select fixed 0–10; «متر» labels for عدد products; plain-text description; spec table from raw attributes; «موجودی» always shown | Options up to stock (or `maxOrderQty`); unit-aware labels; rich-text renderer; spec table in fixed row order from normalised attributes; stock display per settings |
| `familyOf()` = same category | `Family` membership; fallback to material |
| Cart coupon always rejects | `Coupon` validation server action + `CouponUse` |
| `my-account/*` stubs with English WooCommerce text; «نظرسنجی» item | Real orders, addresses, wishlist, wallet, messages, profile — in Persian; «نظرسنجی» is removed (review requests go out by SMS instead) |
| `ProductCard` adds `limit ‖ 1` = 0.5 m, not selectable in the cart modal | Quantity selectors offer the product's `minOrderQty` as the first option |
| Search `haystack().includes(q)`; `/search?s=` and `/shop?q=` | Server search with Persian normalisation over the configured fields; one entry point, the other redirects |
| Per-page `metadata` titles in `layout.tsx`, `shop`, `search`, `offer`, `magazine`, `my-account`, `not-found`, `materials/[slug]` | SEO settings → system page titles |
| Renamed slugs would 404 | `Redirect` table consulted in `middleware.ts` |
| Product page: one image, video button inert | Gallery with several photos and videos (upload or Aparat/YouTube embed) |
| No discount logic anywhere; `salePrice` only | Price resolver applies `DiscountRule`s (scope, tiers, group price, first order…) and shows tier hints and badges; cart shows discount lines |
| No shipping cost, no method choice | Shipping rules engine computes each method's price at the address step; shipping-discount rules and free-shipping messaging |
| «معرف» not collected; no referral | Referral code field at checkout; personal code in my-account |
| No returns | «درخواست مرجوعی» from the order in my-account; cancel-before-shipping button |
| No SMS consent | Promotional-SMS consent at first OTP; opt-out link in account |
| `/offer` empty | Offer/campaign layouts, flash-sale countdown, campaign landing pages at `/campaign/[slug]`; `/?coupon=` pre-fill |

---

## 9. Non-functional requirements

- **Security**: httpOnly SameSite=Lax session cookies; server actions carry built-in CSRF protection; role checks on the server; OTP rate limits; secrets only in env / encrypted settings; uploads validated by magic bytes and re-encoded; audit log immutable (append-only).
- **Performance**: admin lists respond < 300 ms at 10k orders / 5k products (indexed on status, createdAt, phone, sku); storefront stays static-first with tag revalidation; images via object storage + CDN.
- **Reliability**: gateway callbacks idempotent; SMS sends retried with backoff and never block the status change; nightly DB backup with 30-day retention; import runs as a job that can be resumed.
- **Observability**: error tracking (Sentry-compatible), a health check that the dashboard strip reads (DB, gateway, SMS, storage).
- **Localisation**: all admin strings in one `fa.ts` dictionary; Jalali everywhere; Persian digits in UI, Latin digits in exports.
- **Compatibility**: last two versions of Chrome/Safari/Firefox, iOS Safari and Android Chrome for the mobile shell; PWA-installable.

---

## 10. Delivery plan

**Phase 1 — Sell (replace the static catalogue, make orders real).** Auth, roles & permission grid, API keys · Products (list, editor with متری/عددی, photos & videos, stock log) · Attributes · Import of the existing 392 products · Settings: store, delivery + shipping rules, Zarinpal, integrations · SMS section (automatic templates, single send, log, settings) · Checkout → orders · Orders list/detail/status/SMS/print · Manual orders · Basic wallet (needed for refunds) · Dashboard (basic) · Customers (basic) · Audit log. *Storefront: catalogue from DB, real OTP, real checkout, real my-account orders/addresses.*

**Phase 2 — Merchandise (the home page request).** Home & offer builders with preview/publish/history · Menu & footer · Magazine · Pages (about, contact, guide, legal) · Media library · Notifications. *Storefront: section renderer, menu from config, magazine and pages from DB, guide/video popups.*

**Phase 3 — Grow.** Marketing: discount rules, coupons, shipping discounts, campaigns, segments, referral, reports · Mass SMS · Returns & refunds flow (wallet + Zarinpal refund + bank transfer) · Reviews & questions & contact messages · Wishlist sync & heart buttons · Content API and AI-writer review flow · Telegram alerts · Bulk export/backup · Web push · Abandoned-cart view.

Each phase ships behind the `/admin` route with the storefront unchanged until its data source is switched, so the site never regresses mid-migration.

---

## 11. Decisions on the open questions

These were open in v1.0; each is now decided on the best available understanding so that building can start. Any of them can be reversed with a one-line change to the spec, and the storefront/admin defaults below are chosen so that reversing them later is cheap.

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | Zarinpal: ZarinGate or the standard page? Merchant verified? | **Standard Zarinpal payment page, ZarinGate off.** The merchant account is assumed to exist under پرنا تجارت پارسیان; the admin's «تست اتصال» button will confirm it on day one. | ZarinGate needs separate approval; the standard page works for every merchant. The toggle is in Settings → Payment, so switching later is a click. |
| 2 | Carriers and fees; is «ارسال رایگان» unconditional? | **Launch with shipping free everywhere**, exactly as the live site promises («هرجا باشی، مدیلیش سفارشت رایگان ارسال میشه»). Seed one method, پست پیشتاز, with base price 0. The rules engine ships with the example rules **disabled** so the owner can turn pricing on when ready. پیک تهران is seeded as a second, inactive method. | No regression in what customers are told today; the machinery is there for the day free shipping stops being affordable. |
| 3 | One photo or several per product? | **One today, several from now on.** The import puts the existing square photo first; the product editor and gallery support many photos and videos. | Matches the data as it is; nothing in the storefront breaks when a product has only one image. |
| 4 | Track stock per roll? | **Not in v1.** Stock is total metres per product. Each order line can carry a «یک‌تکه» request; staff see it on the packing slip and, if it cannot be honoured, contact the customer before cutting. Roll-level tracking is logged as the first v2 candidate. | Roll tracking doubles the stock model and the counting work; the note covers the real problem (a customer wanting one continuous piece) without it. |
| 5 | Formal tax invoice / VAT? | **Printable order invoice only**, with a sequential number per Jalali year, the store's legal name, address and enamad. A **VAT %** setting exists (default 0, hidden from the customer when 0) so a tax line can be switched on without a schema change. | No indication the shop issues official invoices today; the field costs nothing. |
| 6 | Change-of-mind returns on cut fabric? | **Defect-only for cut lengths.** Change-of-mind returns are accepted within 7 days for **uncut** goods and for عددی items in original condition, with no restocking fee. Both switches are in Settings → Store → «سیاست مرجوعی» and the storefront's «گارانتی ۷ روزه» page renders from them. | Cut-to-order fabric is unsellable once returned; this is the norm for Iranian fabric sellers and keeps the 7-day guarantee honest. |
| 7 | Editorial calendar for the magazine? | **No calendar view in v1.** «انتشار» now, or a `publishAt` date, is enough; the list can be sorted by scheduled date. | One writer plus an AI agent does not need a calendar; add it if the cadence grows. |
