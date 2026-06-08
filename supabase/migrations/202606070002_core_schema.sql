create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admin_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table user_admin_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references admin_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text,
  phone text,
  full_name text,
  loyalty_tier text not null default 'standard',
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  origin text,
  temperature_class text not null,
  status product_status not null default 'draft',
  seo_title text,
  seo_description text,
  search_document tsvector generated always as (
    to_tsvector(
      'simple'::regconfig,
      coalesce(name, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(origin, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null unique,
  barcode text,
  unit text not null,
  option_summary text,
  list_price numeric(12,2) not null check (list_price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  is_active boolean not null default true,
  is_weighable boolean not null default false,
  created_at timestamptz not null default now()
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0
);

create table product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label text,
  receiver_name text not null,
  phone text not null,
  province text not null,
  district text not null,
  ward text not null,
  address_line text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  session_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  warehouse_type text not null,
  address text,
  is_active boolean not null default true
);

create table lots (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id),
  warehouse_id uuid not null references warehouses(id),
  lot_no text not null,
  received_at timestamptz not null default now(),
  expiry_at timestamptz,
  quality_status inventory_quality_status not null default 'sellable',
  unique (variant_id, warehouse_id, lot_no)
);

create table stock_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id),
  warehouse_id uuid not null references warehouses(id),
  lot_id uuid references lots(id),
  movement_type text not null,
  quantity_delta numeric(12,3) not null,
  source_doc_type text not null,
  source_doc_id uuid,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_id uuid references customers(id) on delete set null,
  source_channel text not null default 'web',
  order_status order_status not null default 'draft_checkout',
  payment_status payment_status not null default 'unpaid',
  fulfillment_status fulfillment_status not null default 'unfulfilled',
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  idempotency_key text not null unique,
  placed_at timestamptz,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid references product_variants(id),
  product_name_snapshot text not null,
  sku_snapshot text not null,
  quantity numeric(12,3) not null,
  unit_price numeric(12,2) not null,
  discount_total numeric(12,2) not null default 0,
  promotion_snapshot jsonb not null default '[]'::jsonb
);

create table stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  cart_id uuid references carts(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  warehouse_id uuid not null references warehouses(id),
  lot_id uuid references lots(id),
  quantity numeric(12,3) not null check (quantity > 0),
  status reservation_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  provider_ref text,
  payment_method text not null,
  status payment_status not null,
  amount numeric(12,2) not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index products_search_document_idx on products using gin (search_document);
create index products_name_trgm_idx on products using gin (name gin_trgm_ops);
create index product_variants_product_id_idx on product_variants (product_id);
create index product_categories_category_id_idx on product_categories (category_id);
create index carts_customer_id_idx on carts (customer_id);
create index cart_items_cart_id_idx on cart_items (cart_id);
create index orders_customer_id_idx on orders (customer_id);
create index order_items_order_id_idx on order_items (order_id);
create index stock_ledger_variant_warehouse_idx on stock_ledger_entries (variant_id, warehouse_id);
create index stock_reservations_active_idx on stock_reservations (variant_id, warehouse_id, status, expires_at);
