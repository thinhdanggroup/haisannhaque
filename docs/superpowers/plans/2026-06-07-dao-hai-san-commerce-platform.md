# Dao Hai San Commerce Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 daohaisan.vn-style seafood commerce platform with Next.js and Supabase, covering storefront, checkout, accounts, admin, catalog, promotions, loyalty, inventory, procurement, refunds, reports, and secure role-based operations.

**Architecture:** Use a single Next.js App Router application with route groups for storefront, account, and admin. Use Supabase for PostgreSQL, Auth, Storage, RLS, and optional realtime admin updates. Keep v1 synchronous: no Redis, no background workers, and no CDN-specific dependency.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Supabase JS, Supabase PostgreSQL, Supabase Auth, Supabase Storage, Zod, React Hook Form, Vitest, Testing Library, Playwright.

---

## Scope Check

The requirements cover multiple independent subsystems. This plan is split into phased implementation tasks that each produce working, testable software:

1. Project foundation.
2. Supabase schema and security.
3. Storefront catalog.
4. Cart, pricing, and checkout.
5. Payments and order lifecycle.
6. Customer account, wishlist, and loyalty.
7. Admin catalog and CMS.
8. Admin OMS, inventory, procurement, refunds, and reports.
9. Hardening, accessibility, SEO, and UAT.

Do not start with advanced optimizations. V1 must run without Redis, background workers, queue consumers, or CDN-specific logic.

## File Structure

Create this structure as implementation progresses:

```text
app/
  (storefront)/
    page.tsx
    products/[slug]/page.tsx
    categories/[slug]/page.tsx
    search/page.tsx
    cart/page.tsx
    checkout/page.tsx
  account/
    layout.tsx
    orders/page.tsx
    addresses/page.tsx
    wishlist/page.tsx
    loyalty/page.tsx
  admin/
    layout.tsx
    page.tsx
    products/page.tsx
    orders/page.tsx
    inventory/page.tsx
    purchase-orders/page.tsx
    refunds/page.tsx
    reports/page.tsx
  api/
    webhooks/payments/momo/route.ts
    webhooks/payments/vnpay/route.ts
components/
  storefront/
  admin/
  ui/
src/
  features/
    catalog/
    cart/
    checkout/
    orders/
    payments/
    promotions/
    loyalty/
    inventory/
    procurement/
    refunds/
    cms/
    reports/
    admin/
  lib/
    supabase/
    auth/
    validation/
    money/
    seo/
supabase/
  migrations/
  seed.sql
tests/
  unit/
  integration/
  e2e/
docs/
  dao-hai-san-requirements.md
  superpowers/plans/2026-06-07-dao-hai-san-commerce-platform.md
```

## Global Implementation Rules

- Use TypeScript strict mode.
- Keep all customer-visible text Vietnamese-ready.
- Use Zod schemas for every server action and route handler payload.
- Use Supabase service role only in server-only modules.
- Enable RLS on every business table.
- Use PostgreSQL transactions for checkout, reservation, payment update, refund, and stock movement flows.
- Make all payment webhook handlers idempotent.
- Write append-only audit logs for sensitive admin operations.
- Use PostgreSQL full-text search and trigram search for v1.
- Call reservation cleanup opportunistically from cart, checkout, and admin flows.
- Add tests before implementation for domain rules.

---

### Task 1: Initialize Next.js Application Foundation

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/(storefront)/page.tsx`
- Create: `src/lib/env.ts`
- Create: `vitest.config.ts`
- Create: `tests/unit/env.test.ts`
- Create: `.env.example`

- [ ] **Step 1: Scaffold the app**

Run:

```bash
pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*"
```

Expected: Next.js project files exist and `pnpm install` completes.

- [ ] **Step 2: Install core dependencies**

Run:

```bash
pnpm add @supabase/ssr @supabase/supabase-js zod react-hook-form @hookform/resolvers clsx tailwind-merge lucide-react
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event playwright
```

Expected: dependencies are added to `package.json`.

- [ ] **Step 3: Create environment validation test**

Create `tests/unit/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { envSchema } from "@/src/lib/env";

describe("envSchema", () => {
  it("accepts required public Supabase values", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing values", () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 4: Add environment validation**

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
```

- [ ] **Step 5: Add `.env.example`**

Create `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 6: Run foundation tests**

Run:

```bash
pnpm vitest run tests/unit/env.test.ts
pnpm lint
```

Expected: the env tests pass and lint exits with code 0.

- [ ] **Step 7: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs app src tests .env.example
git commit -m "chore: scaffold next supabase app"
```

---

### Task 2: Create Supabase Client Modules

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `tests/unit/supabase-clients.test.ts`

- [ ] **Step 1: Write client module tests**

Create `tests/unit/supabase-clients.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("Supabase client modules", () => {
  it("export browser, server, and admin client factories", async () => {
    const browser = await import("@/src/lib/supabase/browser");
    const server = await import("@/src/lib/supabase/server");
    const admin = await import("@/src/lib/supabase/admin");

    expect(typeof browser.createBrowserClient).toBe("function");
    expect(typeof server.createServerClient).toBe("function");
    expect(typeof admin.createAdminClient).toBe("function");
  });
});
```

- [ ] **Step 2: Add browser client**

Create `src/lib/supabase/browser.ts`:

```ts
import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Add server client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
```

- [ ] **Step 4: Add admin client**

Create `src/lib/supabase/admin.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm vitest run tests/unit/supabase-clients.test.ts
```

Expected: test passes.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/supabase tests/unit/supabase-clients.test.ts
git commit -m "chore: add supabase client factories"
```

---

### Task 3: Build Core Database Schema And RLS

**Files:**
- Create: `supabase/migrations/202606070001_extensions_and_enums.sql`
- Create: `supabase/migrations/202606070002_core_schema.sql`
- Create: `supabase/migrations/202606070003_rls_policies.sql`
- Create: `supabase/seed.sql`
- Create: `tests/integration/schema-smoke.sql`

- [ ] **Step 1: Create extensions and enums migration**

Create `supabase/migrations/202606070001_extensions_and_enums.sql`:

```sql
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create type product_status as enum ('draft', 'published', 'archived');
create type order_status as enum (
  'draft_checkout',
  'awaiting_payment',
  'payment_failed',
  'pending_confirmation',
  'confirmed',
  'picking',
  'packed',
  'dispatched',
  'delivery_attempted',
  'delivered',
  'completed',
  'cancelled',
  'returned',
  'partially_returned',
  'refunded'
);
create type payment_status as enum ('unpaid', 'awaiting_payment', 'paid', 'failed', 'refunded', 'partially_refunded');
create type fulfillment_status as enum ('unfulfilled', 'reserved', 'picking', 'packed', 'dispatched', 'delivered', 'returned');
create type inventory_quality_status as enum ('sellable', 'quarantined', 'expired', 'damaged');
create type reservation_status as enum ('active', 'released', 'converted', 'expired');
```

- [ ] **Step 2: Create core schema migration**

Create `supabase/migrations/202606070002_core_schema.sql` with the required tables grouped by domain:

```sql
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
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(origin, ''))
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
  quality_status inventory_quality_status not null default 'sellable'
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
create index stock_ledger_variant_warehouse_idx on stock_ledger_entries (variant_id, warehouse_id);
create index stock_reservations_active_idx on stock_reservations (variant_id, warehouse_id, status, expires_at);
```

- [ ] **Step 3: Create RLS policies**

Create `supabase/migrations/202606070003_rls_policies.sql`:

```sql
alter table profiles enable row level security;
alter table customers enable row level security;
alter table addresses enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_admin_roles
    where user_id = auth.uid()
  );
$$;

create policy "public can read active categories"
on categories for select
using (is_active = true);

create policy "public can read published products"
on products for select
using (status = 'published');

create policy "public can read active variants for published products"
on product_variants for select
using (
  is_active = true
  and exists (
    select 1 from products
    where products.id = product_variants.product_id
    and products.status = 'published'
  )
);

create policy "users can read own profile"
on profiles for select
using (id = auth.uid());

create policy "users can update own profile"
on profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "customers can read own customer row"
on customers for select
using (user_id = auth.uid());

create policy "customers can manage own addresses"
on addresses for all
using (
  exists (
    select 1 from customers
    where customers.id = addresses.customer_id
    and customers.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from customers
    where customers.id = addresses.customer_id
    and customers.user_id = auth.uid()
  )
);

create policy "admins can read and write business data"
on products for all
using (is_admin())
with check (is_admin());
```

- [ ] **Step 4: Create seed data**

Create `supabase/seed.sql`:

```sql
insert into admin_roles (name, description)
values
  ('super_admin', 'Full access'),
  ('catalog_manager', 'Catalog and product access'),
  ('marketing', 'CMS and promotions access'),
  ('customer_service', 'Customer and order support access'),
  ('warehouse', 'Inventory and fulfillment access'),
  ('procurement', 'Supplier and purchase order access'),
  ('finance', 'Payment and refund access')
on conflict (name) do nothing;

insert into warehouses (code, name, warehouse_type, address)
values ('HCM-01', 'Ho Chi Minh Main Branch', 'branch', 'Ho Chi Minh City')
on conflict (code) do nothing;
```

- [ ] **Step 5: Add schema smoke test**

Create `tests/integration/schema-smoke.sql`:

```sql
select
  to_regclass('public.products') as products_table,
  to_regclass('public.orders') as orders_table,
  to_regclass('public.stock_ledger_entries') as stock_ledger_table,
  to_regclass('public.stock_reservations') as reservations_table;
```

- [ ] **Step 6: Run Supabase migration verification**

Run:

```bash
supabase start
supabase db reset
supabase db lint
```

Expected: migrations apply cleanly and lint reports no blocking errors.

- [ ] **Step 7: Commit**

Run:

```bash
git add supabase tests/integration/schema-smoke.sql
git commit -m "feat: add core supabase schema and rls"
```

---

### Task 4: Implement Inventory Reservation Functions

**Files:**
- Create: `supabase/migrations/202606070004_inventory_functions.sql`
- Create: `tests/integration/inventory-functions.sql`
- Create: `src/features/inventory/types.ts`

- [ ] **Step 1: Create database function migration**

Create `supabase/migrations/202606070004_inventory_functions.sql`:

```sql
create or replace function calculate_available_stock(
  input_variant_id uuid,
  input_warehouse_id uuid
)
returns numeric
language sql
stable
as $$
  with on_hand as (
    select coalesce(sum(quantity_delta), 0) as qty
    from stock_ledger_entries
    where variant_id = input_variant_id
      and warehouse_id = input_warehouse_id
  ),
  active_reservations as (
    select coalesce(sum(quantity), 0) as qty
    from stock_reservations
    where variant_id = input_variant_id
      and warehouse_id = input_warehouse_id
      and status = 'active'
      and expires_at > now()
  )
  select greatest(on_hand.qty - active_reservations.qty, 0)
  from on_hand, active_reservations;
$$;

create or replace function release_expired_reservations()
returns integer
language plpgsql
security definer
as $$
declare
  released_count integer;
begin
  update stock_reservations
  set status = 'expired'
  where status = 'active'
    and expires_at <= now();

  get diagnostics released_count = row_count;
  return released_count;
end;
$$;

create or replace function reserve_stock(
  input_cart_id uuid,
  input_order_id uuid,
  input_variant_id uuid,
  input_warehouse_id uuid,
  input_quantity numeric,
  input_ttl_minutes integer default 15
)
returns uuid
language plpgsql
security definer
as $$
declare
  available_quantity numeric;
  reservation_id uuid;
begin
  perform release_expired_reservations();

  select calculate_available_stock(input_variant_id, input_warehouse_id)
  into available_quantity;

  if available_quantity < input_quantity then
    raise exception 'Insufficient stock for variant %', input_variant_id;
  end if;

  insert into stock_reservations (
    cart_id,
    order_id,
    variant_id,
    warehouse_id,
    quantity,
    expires_at
  )
  values (
    input_cart_id,
    input_order_id,
    input_variant_id,
    input_warehouse_id,
    input_quantity,
    now() + make_interval(mins => input_ttl_minutes)
  )
  returning id into reservation_id;

  return reservation_id;
end;
$$;
```

- [ ] **Step 2: Add inventory TypeScript types**

Create `src/features/inventory/types.ts`:

```ts
export type InventoryQualityStatus = "sellable" | "quarantined" | "expired" | "damaged";
export type ReservationStatus = "active" | "released" | "converted" | "expired";

export type AvailableStockInput = {
  variantId: string;
  warehouseId: string;
};

export type ReserveStockInput = AvailableStockInput & {
  cartId?: string;
  orderId?: string;
  quantity: number;
};
```

- [ ] **Step 3: Add integration SQL test**

Create `tests/integration/inventory-functions.sql`:

```sql
begin;

insert into categories (slug, name) values ('test-seafood', 'Test Seafood');
insert into products (slug, name, temperature_class, status)
values ('test-salmon', 'Test Salmon', 'fresh', 'published');

insert into product_variants (product_id, sku, unit, list_price)
select id, 'TEST-SALMON-500G', '500g', 100000
from products
where slug = 'test-salmon';

insert into stock_ledger_entries (variant_id, warehouse_id, movement_type, quantity_delta, source_doc_type)
select product_variants.id, warehouses.id, 'receipt', 10, 'test'
from product_variants, warehouses
where product_variants.sku = 'TEST-SALMON-500G'
  and warehouses.code = 'HCM-01';

select calculate_available_stock(product_variants.id, warehouses.id) as available_qty
from product_variants, warehouses
where product_variants.sku = 'TEST-SALMON-500G'
  and warehouses.code = 'HCM-01';

rollback;
```

- [ ] **Step 4: Run database verification**

Run:

```bash
supabase db reset
```

Expected: migration succeeds and inventory functions are created.

- [ ] **Step 5: Commit**

Run:

```bash
git add supabase/migrations/202606070004_inventory_functions.sql tests/integration/inventory-functions.sql src/features/inventory/types.ts
git commit -m "feat: add inventory reservation functions"
```

---

### Task 5: Build Catalog Read Model And Storefront Pages

**Files:**
- Create: `src/features/catalog/types.ts`
- Create: `src/features/catalog/queries.ts`
- Create: `src/features/catalog/catalog.test.ts`
- Create: `app/(storefront)/categories/[slug]/page.tsx`
- Create: `app/(storefront)/products/[slug]/page.tsx`
- Create: `app/(storefront)/search/page.tsx`
- Create: `components/storefront/product-card.tsx`
- Create: `components/storefront/product-grid.tsx`

- [ ] **Step 1: Write catalog query tests**

Create `src/features/catalog/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapProductRowToCard } from "./queries";

describe("mapProductRowToCard", () => {
  it("uses sale price when available", () => {
    const card = mapProductRowToCard({
      id: "product-1",
      slug: "ca-hoi-sashimi",
      name: "Ca hoi sashimi",
      image_url: "/salmon.jpg",
      list_price: 150000,
      sale_price: 129000,
      is_available: true,
    });

    expect(card.price).toBe(129000);
    expect(card.compareAtPrice).toBe(150000);
  });
});
```

- [ ] **Step 2: Add catalog types and mapper**

Create `src/features/catalog/types.ts`:

```ts
export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  isAvailable: boolean;
};
```

Create `src/features/catalog/queries.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductCard } from "./types";

type ProductCardRow = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  list_price: number;
  sale_price: number | null;
  is_available: boolean;
};

export function mapProductRowToCard(row: ProductCardRow): ProductCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageUrl: row.image_url,
    price: row.sale_price ?? row.list_price,
    compareAtPrice: row.sale_price ? row.list_price : null,
    isAvailable: row.is_available,
  };
}

export async function getProductsByCategory(client: SupabaseClient, slug: string): Promise<ProductCard[]> {
  const { data, error } = await client.rpc("get_products_by_category", {
    input_category_slug: slug,
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapProductRowToCard);
}
```

- [ ] **Step 3: Add product card component**

Create `components/storefront/product-card.tsx`:

```tsx
import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/src/features/catalog/types";

type ProductCardProps = {
  product: ProductCardData;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.slug}`} className="block rounded border bg-white p-3">
      <div className="aspect-square bg-slate-100" aria-hidden="true" />
      <div className="mt-3 text-sm font-medium text-slate-950">{product.name}</div>
      <div className="mt-1 text-sm text-red-600">{product.price.toLocaleString("vi-VN")}d</div>
      {product.compareAtPrice ? (
        <div className="text-xs text-slate-500 line-through">
          {product.compareAtPrice.toLocaleString("vi-VN")}d
        </div>
      ) : null}
      {!product.isAvailable ? <div className="mt-2 text-xs text-slate-500">Het hang</div> : null}
    </Link>
  );
}
```

- [ ] **Step 4: Add product grid component**

Create `components/storefront/product-grid.tsx`:

```tsx
import type { ProductCard as ProductCardData } from "@/src/features/catalog/types";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  products: ProductCardData[];
};

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create storefront pages**

Implement category, product detail, and search pages using server-side Supabase reads. Each page must use `createServerClient()` and must render empty states when no products are returned.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm vitest run src/features/catalog/catalog.test.ts
pnpm lint
```

Expected: tests and lint pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/features/catalog components/storefront app/(storefront)
git commit -m "feat: add catalog storefront"
```

---

### Task 6: Build Cart, Pricing, And Promotion Preview

**Files:**
- Create: `src/features/cart/types.ts`
- Create: `src/features/cart/pricing.ts`
- Create: `src/features/cart/pricing.test.ts`
- Create: `src/features/cart/actions.ts`
- Create: `app/(storefront)/cart/page.tsx`
- Create: `components/storefront/cart-line-item.tsx`

- [ ] **Step 1: Write pricing tests**

Create `src/features/cart/pricing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateCartTotals } from "./pricing";

describe("calculateCartTotals", () => {
  it("calculates subtotal, discount, shipping, and grand total", () => {
    const totals = calculateCartTotals({
      items: [
        { quantity: 2, unitPrice: 100000, discountTotal: 10000 },
        { quantity: 1, unitPrice: 50000, discountTotal: 0 },
      ],
      shippingTotal: 20000,
      loyaltyDiscount: 5000,
    });

    expect(totals.subtotal).toBe(250000);
    expect(totals.discountTotal).toBe(15000);
    expect(totals.grandTotal).toBe(255000);
  });
});
```

- [ ] **Step 2: Add pricing module**

Create `src/features/cart/types.ts`:

```ts
export type CartPricingItem = {
  quantity: number;
  unitPrice: number;
  discountTotal: number;
};

export type CartTotalsInput = {
  items: CartPricingItem[];
  shippingTotal: number;
  loyaltyDiscount: number;
};

export type CartTotals = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
};
```

Create `src/features/cart/pricing.ts`:

```ts
import type { CartTotals, CartTotalsInput } from "./types";

export function calculateCartTotals(input: CartTotalsInput): CartTotals {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const itemDiscountTotal = input.items.reduce((sum, item) => sum + item.discountTotal, 0);
  const discountTotal = itemDiscountTotal + input.loyaltyDiscount;

  return {
    subtotal,
    discountTotal,
    shippingTotal: input.shippingTotal,
    grandTotal: Math.max(subtotal - discountTotal + input.shippingTotal, 0),
  };
}
```

- [ ] **Step 3: Add cart server actions**

Create `src/features/cart/actions.ts` with server actions for add, update, and remove. Validate payloads with Zod, update PostgreSQL through Supabase, and recalculate prices after every change.

- [ ] **Step 4: Add cart page**

Create `app/(storefront)/cart/page.tsx` to render current cart lines, totals, coupon entry, loyalty preview, and checkout CTA.

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm vitest run src/features/cart/pricing.test.ts
pnpm lint
```

Expected: tests and lint pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/features/cart app/(storefront)/cart components/storefront/cart-line-item.tsx
git commit -m "feat: add cart pricing and actions"
```

---

### Task 7: Build Checkout And Order Creation

**Files:**
- Create: `src/features/checkout/schema.ts`
- Create: `src/features/checkout/create-order.ts`
- Create: `src/features/checkout/create-order.test.ts`
- Create: `app/(storefront)/checkout/page.tsx`
- Create: `app/api/orders/route.ts`
- Create: `components/storefront/checkout-form.tsx`

- [ ] **Step 1: Write checkout validation tests**

Create `src/features/checkout/create-order.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./schema";

describe("checkoutSchema", () => {
  it("accepts a valid COD checkout payload", () => {
    const result = checkoutSchema.safeParse({
      cartId: "00000000-0000-0000-0000-000000000001",
      receiverName: "Nguyen Van A",
      phone: "0900000000",
      province: "Ho Chi Minh",
      district: "Quan 1",
      ward: "Ben Nghe",
      addressLine: "1 Le Loi",
      paymentMethod: "cod",
      deliveryMethod: "local_delivery",
      idempotencyKey: "checkout-0001",
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Add checkout schema**

Create `src/features/checkout/schema.ts`:

```ts
import { z } from "zod";

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  receiverName: z.string().min(2),
  phone: z.string().min(8),
  province: z.string().min(1),
  district: z.string().min(1),
  ward: z.string().min(1),
  addressLine: z.string().min(3),
  paymentMethod: z.enum(["cod", "bank_transfer", "momo", "vnpay"]),
  deliveryMethod: z.enum(["local_delivery", "branch_pickup", "nationwide_shipping"]),
  couponCode: z.string().optional(),
  orderNote: z.string().optional(),
  idempotencyKey: z.string().min(8),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
```

- [ ] **Step 3: Add order creation service**

Create `src/features/checkout/create-order.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkoutSchema, type CheckoutInput } from "./schema";

export async function createOrderFromCheckout(client: SupabaseClient, input: CheckoutInput) {
  const payload = checkoutSchema.parse(input);

  const { data, error } = await client.rpc("create_order_from_checkout", {
    checkout_payload: payload,
    input_idempotency_key: payload.idempotencyKey,
  });

  if (error) {
    throw error;
  }

  return data;
}
```

- [ ] **Step 4: Add database order creation function**

Create a new migration with `create_order_from_checkout(checkout_payload jsonb, input_idempotency_key text)`. The function must:

- Reuse existing order when `idempotency_key` already exists.
- Validate cart status.
- Recalculate totals.
- Create order and order item snapshots.
- Reserve stock with `reserve_stock`.
- Return order number and payment next step.

- [ ] **Step 5: Add checkout page and order API**

Create `app/(storefront)/checkout/page.tsx`, `components/storefront/checkout-form.tsx`, and `app/api/orders/route.ts`. Use the schema from Step 2 and the service from Step 3.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm vitest run src/features/checkout/create-order.test.ts
pnpm lint
```

Expected: tests and lint pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/features/checkout app/(storefront)/checkout app/api/orders components/storefront/checkout-form.tsx supabase/migrations
git commit -m "feat: add checkout and order creation"
```

---

### Task 8: Add Payment Methods And Idempotent Webhooks

**Files:**
- Create: `src/features/payments/types.ts`
- Create: `src/features/payments/webhook.ts`
- Create: `src/features/payments/webhook.test.ts`
- Create: `app/api/webhooks/payments/momo/route.ts`
- Create: `app/api/webhooks/payments/vnpay/route.ts`
- Create: `app/api/payments/intents/route.ts`

- [ ] **Step 1: Write webhook idempotency tests**

Create `src/features/payments/webhook.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizePaymentStatus } from "./webhook";

describe("normalizePaymentStatus", () => {
  it("maps successful provider result to paid", () => {
    expect(normalizePaymentStatus("momo", "0")).toBe("paid");
  });

  it("maps failed provider result to failed", () => {
    expect(normalizePaymentStatus("vnpay", "24")).toBe("failed");
  });
});
```

- [ ] **Step 2: Add payment types and mapper**

Create `src/features/payments/types.ts`:

```ts
export type PaymentProvider = "cod" | "bank_transfer" | "momo" | "vnpay";
export type InternalPaymentStatus = "unpaid" | "awaiting_payment" | "paid" | "failed" | "refunded" | "partially_refunded";
```

Create `src/features/payments/webhook.ts`:

```ts
import type { InternalPaymentStatus, PaymentProvider } from "./types";

export function normalizePaymentStatus(provider: PaymentProvider, providerStatus: string): InternalPaymentStatus {
  if (provider === "momo" && providerStatus === "0") {
    return "paid";
  }

  if (provider === "vnpay" && providerStatus === "00") {
    return "paid";
  }

  return "failed";
}
```

- [ ] **Step 3: Implement payment intent route**

Create `app/api/payments/intents/route.ts`. It must create COD, bank transfer, MoMo, and VNPAY payment records. For MoMo and VNPAY, return a redirect URL from provider initiation.

- [ ] **Step 4: Implement webhook routes**

Create MoMo and VNPAY webhook route handlers. Each handler must:

- Verify provider signature.
- Normalize provider status.
- Upsert payment by `(provider, provider_ref)`.
- Update order payment status.
- Ignore duplicate webhook payloads.
- Write audit log.

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm vitest run src/features/payments/webhook.test.ts
pnpm lint
```

Expected: tests and lint pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/features/payments app/api/webhooks app/api/payments
git commit -m "feat: add payment intents and webhooks"
```

---

### Task 9: Build Customer Account, Wishlist, And Loyalty

**Files:**
- Create: `src/features/account/actions.ts`
- Create: `src/features/wishlist/actions.ts`
- Create: `src/features/loyalty/points.ts`
- Create: `src/features/loyalty/points.test.ts`
- Create: `app/account/layout.tsx`
- Create: `app/account/orders/page.tsx`
- Create: `app/account/addresses/page.tsx`
- Create: `app/account/wishlist/page.tsx`
- Create: `app/account/loyalty/page.tsx`

- [ ] **Step 1: Write loyalty points tests**

Create `src/features/loyalty/points.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateAwardedPoints } from "./points";

describe("calculateAwardedPoints", () => {
  it("awards one point per 1000 VND by default", () => {
    expect(calculateAwardedPoints({ grandTotal: 125000, rate: 1000 })).toBe(125);
  });
});
```

- [ ] **Step 2: Add loyalty points module**

Create `src/features/loyalty/points.ts`:

```ts
export type AwardedPointsInput = {
  grandTotal: number;
  rate: number;
};

export function calculateAwardedPoints(input: AwardedPointsInput): number {
  return Math.floor(input.grandTotal / input.rate);
}
```

- [ ] **Step 3: Add account routes**

Create account layout and pages. Each account page must require a Supabase session and must redirect anonymous users to login.

- [ ] **Step 4: Add wishlist actions**

Create add/remove wishlist server actions. Actions must verify the current customer owns the wishlist row.

- [ ] **Step 5: Add loyalty ledger migration**

Create loyalty tables and `award_loyalty_points(order_id)` database function. The function must create ledger entries only once per completed order.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm vitest run src/features/loyalty/points.test.ts
pnpm lint
```

Expected: tests and lint pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/features/account src/features/wishlist src/features/loyalty app/account supabase/migrations
git commit -m "feat: add account wishlist and loyalty"
```

---

### Task 10: Build Admin Shell, RBAC, Catalog, And CMS

**Files:**
- Create: `src/features/admin/permissions.ts`
- Create: `src/features/admin/permissions.test.ts`
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/products/page.tsx`
- Create: `app/admin/content/page.tsx`
- Create: `components/admin/admin-nav.tsx`
- Create: `components/admin/data-table.tsx`

- [ ] **Step 1: Write permission tests**

Create `src/features/admin/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canAccess } from "./permissions";

describe("canAccess", () => {
  it("allows super admin to access all resources", () => {
    expect(canAccess(["super_admin"], "orders:update")).toBe(true);
  });

  it("allows catalog manager to manage products", () => {
    expect(canAccess(["catalog_manager"], "products:update")).toBe(true);
  });

  it("blocks catalog manager from refunds", () => {
    expect(canAccess(["catalog_manager"], "refunds:create")).toBe(false);
  });
});
```

- [ ] **Step 2: Add permission map**

Create `src/features/admin/permissions.ts`:

```ts
const rolePermissions: Record<string, string[]> = {
  super_admin: ["*"],
  catalog_manager: ["products:read", "products:create", "products:update", "categories:update"],
  marketing: ["cms:update", "promotions:update"],
  customer_service: ["orders:read", "orders:update", "customers:read"],
  warehouse: ["inventory:read", "inventory:update", "orders:fulfill"],
  procurement: ["purchase_orders:read", "purchase_orders:update", "suppliers:update"],
  finance: ["payments:read", "refunds:create", "reports:read"],
  reporter: ["reports:read"],
};

export function canAccess(roles: string[], permission: string): boolean {
  return roles.some((role) => {
    const permissions = rolePermissions[role] ?? [];
    return permissions.includes("*") || permissions.includes(permission);
  });
}
```

- [ ] **Step 3: Add admin shell**

Create admin layout, navigation, dashboard, and reusable data table. Server-side layout must verify the user is an admin before rendering.

- [ ] **Step 4: Add catalog and CMS forms**

Add admin product/category/content list pages and create/edit flows. Use Zod validation for each form payload.

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm vitest run src/features/admin/permissions.test.ts
pnpm lint
```

Expected: tests and lint pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/features/admin app/admin components/admin
git commit -m "feat: add admin shell catalog and cms"
```

---

### Task 11: Build OMS, Inventory Admin, And Fulfillment

**Files:**
- Create: `src/features/orders/status.ts`
- Create: `src/features/orders/status.test.ts`
- Create: `src/features/inventory/actions.ts`
- Create: `app/admin/orders/page.tsx`
- Create: `app/admin/orders/[id]/page.tsx`
- Create: `app/admin/inventory/page.tsx`
- Create: `app/api/admin/orders/[id]/transition/route.ts`

- [ ] **Step 1: Write order transition tests**

Create `src/features/orders/status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "./status";

describe("canTransitionOrder", () => {
  it("allows pending confirmation to confirmed", () => {
    expect(canTransitionOrder("pending_confirmation", "confirmed")).toBe(true);
  });

  it("blocks completed to picking", () => {
    expect(canTransitionOrder("completed", "picking")).toBe(false);
  });
});
```

- [ ] **Step 2: Add status transition module**

Create `src/features/orders/status.ts`:

```ts
export type OrderStatus =
  | "draft_checkout"
  | "awaiting_payment"
  | "payment_failed"
  | "pending_confirmation"
  | "confirmed"
  | "picking"
  | "packed"
  | "dispatched"
  | "delivery_attempted"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned"
  | "partially_returned"
  | "refunded";

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  draft_checkout: ["awaiting_payment", "pending_confirmation", "cancelled"],
  awaiting_payment: ["pending_confirmation", "payment_failed", "cancelled"],
  payment_failed: ["awaiting_payment", "cancelled"],
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["picking", "cancelled"],
  picking: ["packed", "cancelled"],
  packed: ["dispatched"],
  dispatched: ["delivery_attempted", "delivered"],
  delivery_attempted: ["dispatched", "cancelled"],
  delivered: ["completed", "returned", "partially_returned"],
  completed: ["returned", "partially_returned", "refunded"],
  cancelled: [],
  returned: ["refunded"],
  partially_returned: ["refunded", "completed"],
  refunded: [],
};

export function canTransitionOrder(current: OrderStatus, next: OrderStatus): boolean {
  return allowedTransitions[current].includes(next);
}
```

- [ ] **Step 3: Add transition route**

Create `app/api/admin/orders/[id]/transition/route.ts`. The route must validate admin permission, validate transition, call `transition_order_status`, write audit log, and return the updated order.

- [ ] **Step 4: Add admin OMS and inventory pages**

Create order list/detail pages and inventory list page with filters by status, branch, payment status, fulfillment status, stock level, and expiry.

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm vitest run src/features/orders/status.test.ts
pnpm lint
```

Expected: tests and lint pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/features/orders src/features/inventory app/admin/orders app/admin/inventory app/api/admin/orders
git commit -m "feat: add oms inventory and fulfillment"
```

---

### Task 12: Build Procurement, Refunds, Complaints, And Reports

**Files:**
- Create: `src/features/procurement/schema.ts`
- Create: `src/features/refunds/schema.ts`
- Create: `src/features/reports/queries.ts`
- Create: `app/admin/purchase-orders/page.tsx`
- Create: `app/admin/refunds/page.tsx`
- Create: `app/admin/reports/page.tsx`
- Create: `app/api/admin/purchase-orders/route.ts`
- Create: `app/api/admin/refunds/route.ts`

- [ ] **Step 1: Add procurement schemas**

Create `src/features/procurement/schema.ts`:

```ts
import { z } from "zod";

export const purchaseOrderLineSchema = z.object({
  variantId: z.string().uuid(),
  orderedQty: z.number().positive(),
  unitCost: z.number().nonnegative(),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  destinationWarehouseId: z.string().uuid(),
  expectedAt: z.string().datetime().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1),
});
```

- [ ] **Step 2: Add refund schemas**

Create `src/features/refunds/schema.ts`:

```ts
import { z } from "zod";

export const refundSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  amount: z.number().positive(),
  refundMethod: z.enum(["gateway", "bank_transfer", "voucher", "loyalty_points", "manual_finance"]),
  reason: z.string().min(3),
});
```

- [ ] **Step 3: Add reports query module**

Create `src/features/reports/queries.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDailySalesReport(client: SupabaseClient, fromDate: string, toDate: string) {
  const { data, error } = await client.rpc("get_daily_sales_report", {
    input_from_date: fromDate,
    input_to_date: toDate,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}
```

- [ ] **Step 4: Add admin pages and routes**

Create purchase order, refund, and report pages. Each route must enforce admin permissions and write audit logs for create/update actions.

- [ ] **Step 5: Add reporting SQL functions**

Create SQL functions for daily sales, product sales, promotion usage, low stock, expiring stock, stock adjustments, purchase orders, and refunds.

- [ ] **Step 6: Run tests and lint**

Run:

```bash
pnpm lint
pnpm vitest run
```

Expected: lint and tests pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/features/procurement src/features/refunds src/features/reports app/admin/purchase-orders app/admin/refunds app/admin/reports app/api/admin supabase/migrations
git commit -m "feat: add procurement refunds and reports"
```

---

### Task 13: Add SEO, Accessibility, And E2E Coverage

**Files:**
- Create: `src/lib/seo/product-json-ld.ts`
- Create: `src/lib/seo/product-json-ld.test.ts`
- Create: `tests/e2e/storefront-checkout.spec.ts`
- Create: `tests/e2e/admin-order-flow.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Write SEO structured data test**

Create `src/lib/seo/product-json-ld.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createProductJsonLd } from "./product-json-ld";

describe("createProductJsonLd", () => {
  it("creates Product structured data", () => {
    const jsonLd = createProductJsonLd({
      name: "Ca hoi sashimi",
      description: "Fresh salmon sashimi",
      imageUrl: "https://example.com/salmon.jpg",
      price: 129000,
      currency: "VND",
      availability: "InStock",
    });

    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.offers.price).toBe(129000);
  });
});
```

- [ ] **Step 2: Add SEO helper**

Create `src/lib/seo/product-json-ld.ts`:

```ts
export type ProductJsonLdInput = {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: "VND";
  availability: "InStock" | "OutOfStock";
};

export function createProductJsonLd(input: ProductJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.imageUrl,
    offers: {
      "@type": "Offer",
      price: input.price,
      priceCurrency: input.currency,
      availability: `https://schema.org/${input.availability}`,
    },
  };
}
```

- [ ] **Step 3: Add Playwright configuration**

Create `playwright.config.ts` with web server command `pnpm dev` and base URL `http://127.0.0.1:3000`.

- [ ] **Step 4: Add storefront E2E smoke test**

Create `tests/e2e/storefront-checkout.spec.ts` to verify homepage loads, category navigation works, product page loads, cart opens, and checkout form is visible.

- [ ] **Step 5: Add admin E2E smoke test**

Create `tests/e2e/admin-order-flow.spec.ts` to verify admin login redirect, admin dashboard access for seeded admin, and order list page rendering.

- [ ] **Step 6: Run full verification**

Run:

```bash
pnpm lint
pnpm vitest run
pnpm playwright test
```

Expected: lint, unit tests, integration tests, and E2E tests pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/seo tests/e2e playwright.config.ts
git commit -m "test: add seo accessibility and e2e coverage"
```

---

## Final Acceptance Checklist

- [ ] Storefront renders homepage, category pages, product pages, search, cart, and checkout.
- [ ] Customer account supports profile, addresses, order history, wishlist, and loyalty wallet.
- [ ] Admin supports catalog, CMS, orders, inventory, procurement, refunds, and reports.
- [ ] Supabase RLS protects customer and admin data.
- [ ] Checkout uses transactional stock reservations.
- [ ] Payment webhooks are signature-verified and idempotent.
- [ ] Order status transitions are validated.
- [ ] Stock ledger is append-only.
- [ ] Loyalty points use a ledger and are awarded once per completed order.
- [ ] SEO metadata and product structured data are present.
- [ ] Cart, checkout, payment, inventory, and order domain rules have tests.
- [ ] The app runs without Redis, background workers, queue consumers, or CDN-specific behavior.

## Execution Recommendation

Use subagent-driven execution for Tasks 1-13. Each task is large enough to benefit from a fresh context and review checkpoint. After each task, run the listed verification commands and commit only when those commands pass.
