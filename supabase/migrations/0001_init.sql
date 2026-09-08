-- Modilish initial schema
-- Mirrors the shapes in lib/products.ts, lib/orders.ts, lib/orderStore.ts,
-- lib/siteStore.ts, lib/siteContent.ts and lib/auth.ts (the current
-- data/*.json flat-file store) as real Postgres tables.
--
-- Everything here is written server-side today (Next.js Server
-- Components/Actions using node:fs), so every table gets RLS enabled with
-- NO policies: only the service_role key (used server-side only, never
-- shipped to the browser) can read/write. Add narrower anon SELECT
-- policies later if/when you want client-side Supabase queries (e.g. for
-- the public storefront reading products directly).

-- ============================= products =============================

create table if not exists products (
  id integer primary key,
  slug text unique not null,
  name text not null,
  price integer not null default 0,
  sale_price integer not null default 0,
  meters numeric not null default 0,
  limit_meters numeric not null default 0.5,
  unit text not null check (unit in ('متر', 'عدد')),
  image text not null default '',
  category text not null default '',
  rating numeric not null default 0,
  attributes jsonb not null default '[]',
  description text not null default '',
  status text not null default 'published' check (status in ('published', 'draft', 'hidden')),
  video_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on products (category);
create index if not exists products_status_idx on products (status);

-- ============================== orders ===============================

create table if not exists orders (
  key text primary key,
  created_at timestamptz not null default now(),
  status text not null,
  payment_status text not null,
  payment_method text not null,
  payment_ref text,
  paid_at timestamptz,
  customer jsonb not null, -- { name, phone, nationalCode?, referral? }
  delivery jsonb not null, -- post: {type,carrier,recipient,mobile,...} | pickup: {type,day,hour,cod}
  lines jsonb not null default '[]',
  subtotal integer not null default 0,
  discount integer not null default 0,
  coupon_code text,
  shipping integer not null default 0,
  total integer not null default 0,
  customer_note text,
  internal_notes text[] not null default '{}',
  source text not null default 'web' check (source in ('web', 'manual')),
  cancel_reason text
);
create index if not exists orders_customer_phone_idx on orders (((customer ->> 'phone')));
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_at_idx on orders (created_at desc);

create table if not exists order_events (
  id bigint generated always as identity primary key,
  order_key text not null references orders (key) on delete cascade,
  at timestamptz not null default now(),
  type text not null check (type in ('created', 'status', 'note', 'sms', 'edit', 'refund')),
  text text not null,
  by text not null
);
create index if not exists order_events_order_key_idx on order_events (order_key);

-- ============================ customers ==============================
-- Customer *summary* (name, totals, etc.) is derived live from orders;
-- only the admin-editable meta needs its own table.

create table if not exists customer_meta (
  phone text primary key,
  tags text[] not null default '{}',
  notes text[] not null default '{}',
  blocked boolean not null default false,
  wallet_toman integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================ questions ===============================

create table if not exists questions (
  id text primary key,
  slug text not null references products (slug) on delete cascade,
  product_name text not null,
  name text not null,
  phone text,
  text text not null,
  answer text,
  status text not null default 'pending' check (status in ('pending', 'answered', 'rejected')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists questions_slug_idx on questions (slug);

-- ============================= reviews ================================

create table if not exists reviews (
  id text primary key,
  slug text not null references products (slug) on delete cascade,
  product_name text not null,
  name text not null,
  phone text,
  rating numeric not null,
  text text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reply text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reviews_slug_idx on reviews (slug);

-- ========================= contact messages ===========================

create table if not exists contact_messages (
  id text primary key,
  name text not null,
  phone text,
  text text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- ============================= sms log ================================

create table if not exists sms_log (
  id text primary key,
  at timestamptz not null default now(),
  phone text not null,
  order_key text references orders (key) on delete set null,
  kind text not null check (kind in ('otp', 'auto', 'mass', 'single')),
  template text not null,
  text text not null,
  status text not null check (status in ('delivered', 'queued', 'failed', 'simulated')),
  cost_toman integer not null default 0,
  line text not null default 'service' check (line in ('service', 'promo'))
);
create index if not exists sms_log_phone_idx on sms_log (phone);
create index if not exists sms_log_at_idx on sms_log (at desc);

-- ============================= audit log ===============================

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  "user" text not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  summary text not null default ''
);
create index if not exists audit_log_at_idx on audit_log (at desc);

-- ========================== admin auth ================================
-- Structure only — not backfilled from data/sessions.json / data/otp.json
-- (those held live tokens / OTP codes, deliberately not migrated).

create table if not exists admin_sessions (
  token text primary key,
  phone text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  user_agent text
);
create index if not exists admin_sessions_phone_idx on admin_sessions (phone);

create table if not exists admin_otp (
  phone text primary key,
  code text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  sent_at timestamptz[] not null default '{}'
);

-- ============================ notifications ============================
-- Single row of admin-UI read-state (matches data/notifications state today).

create table if not exists notification_state (
  id boolean primary key default true check (id),
  read_ids text[] not null default '{}',
  read_all_at timestamptz
);

-- ========================= site: settings ==============================
-- One row per top-level SiteSettings key — mirrors saveSettings<K>(key,
-- value) in lib/siteStore.ts and the per-key entries in the audit log.

create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ========================= site: layouts ================================
-- Page-builder content for "home" / "offer" (draft + published + history).

create table if not exists site_layouts (
  page_key text primary key,
  draft jsonb not null,
  published jsonb not null,
  published_at timestamptz,
  history jsonb not null default '[]'
);

-- ========================== site: pages =================================

create table if not exists site_pages (
  slug text primary key,
  title text not null,
  status text not null default 'published',
  body jsonb not null default '[]',
  image text,
  bullets text[],
  show_circles boolean not null default false,
  show_contact boolean not null default false
);

-- ========================= site: magazine posts ==========================

create table if not exists site_posts (
  slug text primary key,
  title text not null,
  excerpt text not null default '',
  date date not null,
  read_minutes integer not null default 3,
  image text,
  body jsonb not null default '[]',
  related jsonb not null default '[]',
  status text not null default 'published',
  author text,
  author_type text
);
create index if not exists site_posts_status_idx on site_posts (status);

-- =============================== RLS ====================================
-- Locked down by default — server code talks to Supabase with the
-- service_role key (bypasses RLS), same trust boundary as the current
-- server-only fs access. No anon/authenticated policies yet.

alter table products enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table customer_meta enable row level security;
alter table questions enable row level security;
alter table reviews enable row level security;
alter table contact_messages enable row level security;
alter table sms_log enable row level security;
alter table audit_log enable row level security;
alter table admin_sessions enable row level security;
alter table admin_otp enable row level security;
alter table notification_state enable row level security;
alter table site_settings enable row level security;
alter table site_layouts enable row level security;
alter table site_pages enable row level security;
alter table site_posts enable row level security;
