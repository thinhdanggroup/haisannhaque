# Daohaisan-Inspired Frontend UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a daohaisan.vn-inspired public storefront and seafood operations admin UI, with every visible screen backed by Supabase data or seeded CMS/merchandising data.

**Architecture:** Keep the app as a Next.js App Router modular monolith. Add a small Supabase CMS/merchandising schema, load storefront chrome and homepage sections from server components, and reuse dense UI primitives across storefront and admin surfaces.

**Tech Stack:** Next.js 16.2.7 App Router, React 19, TypeScript strict mode, Tailwind CSS 4, Supabase/PostgreSQL/RLS, Zod, Vitest, Playwright, lucide-react.

---

## Source Documents

- Design spec: `docs/superpowers/specs/2026-06-07-daohaisan-inspired-frontend-ui-design.md`
- Project guide: `AGENTS.md`
- Next.js App Router guide: `node_modules/next/dist/docs/01-app/index.md`
- Current implementation plan baseline: `docs/superpowers/plans/2026-06-07-dao-hai-san-commerce-platform.md`

## File Structure

Create and modify these files during implementation:

```text
app/
  (storefront)/
    page.tsx
    categories/[slug]/page.tsx
    search/page.tsx
    products/[slug]/page.tsx
    cart/page.tsx
    checkout/page.tsx
  admin/
    layout.tsx
    page.tsx
    products/page.tsx
    orders/page.tsx
    inventory/page.tsx
    purchase-orders/page.tsx
    refunds/page.tsx
    complaints/page.tsx
    content/page.tsx
    reports/page.tsx
  globals.css
components/
  admin/
    admin-data-table.tsx
    admin-page-header.tsx
    admin-shell.tsx
    empty-state.tsx
    filter-bar.tsx
    metric-tile.tsx
    status-chip.tsx
  storefront/
    category-nav.tsx
    category-sidebar.tsx
    floating-contact-actions.tsx
    hero-merchandising-grid.tsx
    mobile-storefront-dock.tsx
    product-card.tsx
    product-detail-view.tsx
    product-grid.tsx
    product-rail.tsx
    promo-band.tsx
    service-strip.tsx
    storefront-footer.tsx
    storefront-header.tsx
src/
  features/
    admin/
      dashboard.ts
    catalog/
      queries.ts
      types.ts
    cms/
      queries.test.ts
      queries.ts
      types.ts
    inventory/
      queries.ts
    orders/
      queries.ts
  lib/
    format.test.ts
    format.ts
supabase/
  migrations/
    202606070010_cms_merchandising.sql
  seed.sql
tests/
  e2e/
    admin-order-flow.spec.ts
    storefront-checkout.spec.ts
  integration/
    cms-merchandising.sql
```

## Global Implementation Rules

- Read `node_modules/next/dist/docs/01-app/index.md` before editing App Router files.
- Use server components by default for data-backed pages.
- Add `"use client"` only for components that need browser interaction.
- Keep Supabase service-role access server-only.
- Keep all new TypeScript exported functions typed.
- Use Zod for new mutation payloads.
- Use `lucide-react` icons for action buttons and navigation.
- Use original, neutral, or generated seafood assets. Do not copy daohaisan.vn assets or prose.
- Keep public UI Vietnamese-ready. Existing text may stay ASCII Vietnamese during implementation.

---

### Task 1: Add CMS/Merchandising Schema

**Files:**
- Create: `tests/integration/cms-merchandising.sql`
- Create: `supabase/migrations/202606070010_cms_merchandising.sql`

- [ ] **Step 1: Write the CMS integration smoke test**

Create `tests/integration/cms-merchandising.sql`:

```sql
begin;

select
  to_regclass('public.cms_pages') as cms_pages_table,
  to_regclass('public.cms_sections') as cms_sections_table,
  to_regclass('public.cms_banners') as cms_banners_table,
  to_regclass('public.cms_section_products') as cms_section_products_table,
  to_regclass('public.cms_navigation_items') as cms_navigation_items_table,
  to_regclass('public.cms_footer_links') as cms_footer_links_table,
  to_regclass('public.cms_brand_assets') as cms_brand_assets_table;

do $$
begin
  if to_regclass('public.cms_pages') is null then
    raise exception 'cms_pages table is missing';
  end if;

  if to_regclass('public.cms_sections') is null then
    raise exception 'cms_sections table is missing';
  end if;

  if to_regclass('public.cms_navigation_items') is null then
    raise exception 'cms_navigation_items table is missing';
  end if;
end $$;

rollback;
```

- [ ] **Step 2: Run the smoke test before the migration**

Run against a migrated local database:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/integration/cms-merchandising.sql
```

Expected: `ERROR: cms_pages table is missing`.

- [ ] **Step 3: Add the CMS migration**

Create `supabase/migrations/202606070010_cms_merchandising.sql`:

```sql
create table cms_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique,
  title text not null,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cms_sections (
  id uuid primary key default gen_random_uuid(),
  page_key text not null references cms_pages(page_key) on delete cascade,
  section_key text not null,
  section_type text not null check (
    section_type in (
      'hero',
      'service_strip',
      'category_shortcuts',
      'product_rail',
      'flash_sale',
      'promo_band',
      'recommendation_tabs',
      'partner_strip',
      'content_highlights',
      'footer'
    )
  ),
  title text,
  subtitle text,
  layout text not null default 'default',
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_key, section_key)
);

create table cms_banners (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references cms_sections(id) on delete cascade,
  title text not null,
  subtitle text,
  image_url text not null,
  mobile_image_url text,
  cta_label text,
  cta_href text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table cms_section_products (
  section_id uuid not null references cms_sections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  sort_order integer not null default 0,
  badge_text text,
  primary key (section_id, product_id)
);

create table cms_navigation_items (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('header', 'sidebar', 'mobile_dock', 'footer')),
  parent_id uuid references cms_navigation_items(id) on delete cascade,
  label text not null,
  href text not null,
  icon_key text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table cms_footer_links (
  id uuid primary key default gen_random_uuid(),
  group_label text not null,
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table cms_brand_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null,
  placement text not null check (placement in ('partner', 'payment', 'trust', 'brand')),
  image_url text not null,
  alt_text text not null,
  href text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (placement, asset_key)
);

create index cms_sections_page_sort_idx on cms_sections (page_key, is_active, sort_order);
create index cms_banners_section_sort_idx on cms_banners (section_id, is_active, sort_order);
create index cms_navigation_items_placement_sort_idx on cms_navigation_items (placement, is_active, sort_order);
create index cms_footer_links_group_sort_idx on cms_footer_links (group_label, is_active, sort_order);
create index cms_brand_assets_placement_sort_idx on cms_brand_assets (placement, is_active, sort_order);

alter table cms_pages enable row level security;
alter table cms_sections enable row level security;
alter table cms_banners enable row level security;
alter table cms_section_products enable row level security;
alter table cms_navigation_items enable row level security;
alter table cms_footer_links enable row level security;
alter table cms_brand_assets enable row level security;

create policy "public can read published cms pages"
on cms_pages for select
using (status = 'published');

create policy "public can read active cms sections"
on cms_sections for select
using (
  is_active = true
  and exists (
    select 1
    from cms_pages
    where cms_pages.page_key = cms_sections.page_key
      and cms_pages.status = 'published'
  )
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

create policy "public can read active cms banners"
on cms_banners for select
using (
  is_active = true
  and exists (
    select 1
    from cms_sections
    where cms_sections.id = cms_banners.section_id
      and cms_sections.is_active = true
  )
);

create policy "public can read cms section products"
on cms_section_products for select
using (
  exists (
    select 1
    from cms_sections
    where cms_sections.id = cms_section_products.section_id
      and cms_sections.is_active = true
  )
);

create policy "public can read active navigation items"
on cms_navigation_items for select
using (is_active = true);

create policy "public can read active footer links"
on cms_footer_links for select
using (is_active = true);

create policy "public can read active brand assets"
on cms_brand_assets for select
using (is_active = true);

create policy "marketing can manage cms pages"
on cms_pages for all
using (has_admin_permission('cms:update') or has_admin_permission('*'))
with check (has_admin_permission('cms:update') or has_admin_permission('*'));

create policy "marketing can manage cms sections"
on cms_sections for all
using (has_admin_permission('cms:update') or has_admin_permission('*'))
with check (has_admin_permission('cms:update') or has_admin_permission('*'));

create policy "marketing can manage cms banners"
on cms_banners for all
using (has_admin_permission('cms:update') or has_admin_permission('*'))
with check (has_admin_permission('cms:update') or has_admin_permission('*'));

create policy "marketing can manage cms section products"
on cms_section_products for all
using (has_admin_permission('cms:update') or has_admin_permission('*'))
with check (has_admin_permission('cms:update') or has_admin_permission('*'));

create policy "marketing can manage navigation items"
on cms_navigation_items for all
using (has_admin_permission('cms:update') or has_admin_permission('*'))
with check (has_admin_permission('cms:update') or has_admin_permission('*'));

create policy "marketing can manage footer links"
on cms_footer_links for all
using (has_admin_permission('cms:update') or has_admin_permission('*'))
with check (has_admin_permission('cms:update') or has_admin_permission('*'));

create policy "marketing can manage brand assets"
on cms_brand_assets for all
using (has_admin_permission('cms:update') or has_admin_permission('*'))
with check (has_admin_permission('cms:update') or has_admin_permission('*'));
```

- [ ] **Step 4: Run SQL checks**

Run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202606070010_cms_merchandising.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/integration/cms-merchandising.sql
```

Expected: migration succeeds and the smoke test exits 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202606070010_cms_merchandising.sql tests/integration/cms-merchandising.sql
git commit -m "feat: add cms merchandising schema"
```

---

### Task 2: Seed Supabase-Backed Storefront Content

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Append catalog and CMS seed data**

Append this block to `supabase/seed.sql`:

```sql
insert into categories (slug, name, sort_order)
values
  ('best-sellers', 'Best sellers', 10),
  ('promotions', 'Promotions', 20),
  ('sashimi', 'Sushi and sashimi', 30),
  ('fresh-seafood', 'Fresh seafood', 40),
  ('frozen-seafood', 'Frozen seafood', 50),
  ('ready-to-eat', 'Ready to eat', 60),
  ('salmon', 'Salmon', 70),
  ('shrimp-crab', 'Shrimp and crab', 80)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

with product_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"slug":"alaska-lobster-500g","name":"Alaska lobster 500g","category":"best-sellers","temperature":"live","origin":"Imported","price":745000,"sale":499000,"unit":"1 con","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Alaska+Lobster"},
      {"slug":"korean-abalone-live","name":"Korean abalone live","category":"best-sellers","temperature":"live","origin":"Korea","price":99000,"sale":65000,"unit":"1 con","image":"https://placehold.co/900x700/e8f5e9/0f172a?text=Korean+Abalone"},
      {"slug":"fresh-salmon-loin","name":"Fresh salmon loin","category":"salmon","temperature":"fresh","origin":"Norway","price":249000,"sale":null,"unit":"tray 200g","image":"https://placehold.co/900x700/fff3e0/0f172a?text=Fresh+Salmon"},
      {"slug":"green-lobster-live","name":"Green lobster live","category":"fresh-seafood","temperature":"live","origin":"Vietnam","price":535000,"sale":429000,"unit":"con 350g","image":"https://placehold.co/900x700/e3f2fd/0f172a?text=Green+Lobster"},
      {"slug":"sashimi-mix-family","name":"Family sashimi mix","category":"sashimi","temperature":"chilled","origin":"Dao Seafood","price":965000,"sale":799000,"unit":"combo","image":"https://placehold.co/900x700/fce4ec/0f172a?text=Sashimi+Mix"},
      {"slug":"shrimp-teriyaki-maki","name":"Shrimp teriyaki maki","category":"sashimi","temperature":"ready","origin":"Dao Kitchen","price":99000,"sale":null,"unit":"portion","image":"https://placehold.co/900x700/f3e5f5/0f172a?text=Shrimp+Maki"},
      {"slug":"peeled-white-shrimp","name":"Peeled white shrimp","category":"frozen-seafood","temperature":"frozen","origin":"Vietnam","price":79000,"sale":69000,"unit":"tray 150g","image":"https://placehold.co/900x700/e1f5fe/0f172a?text=Peeled+Shrimp"},
      {"slug":"ready-meal-salmon-soy","name":"Soy-marinated salmon bowl","category":"ready-to-eat","temperature":"ready","origin":"Dao Kitchen","price":179000,"sale":null,"unit":"tray","image":"https://placehold.co/900x700/fff8e1/0f172a?text=Salmon+Bowl"},
      {"slug":"clam-combo","name":"Three clam combo","category":"promotions","temperature":"fresh","origin":"Vietnam","price":119000,"sale":null,"unit":"combo","image":"https://placehold.co/900x700/e0f2f1/0f172a?text=Clam+Combo"},
      {"slug":"blue-crab-live","name":"Live blue crab","category":"shrimp-crab","temperature":"live","origin":"Vietnam","price":390000,"sale":369000,"unit":"1kg","image":"https://placehold.co/900x700/ede7f6/0f172a?text=Blue+Crab"}
    ]'::jsonb
  ) as product(
    slug text,
    name text,
    category text,
    temperature text,
    origin text,
    price numeric,
    sale numeric,
    unit text,
    image text
  )
),
upserted_products as (
  insert into products (slug, name, short_description, description, origin, temperature_class, status, seo_title, seo_description)
  select
    slug,
    name,
    'Fresh seafood selected for fast local delivery.',
    'Prepared for a dense Vietnamese seafood commerce storefront with original Dao Seafood content.',
    origin,
    temperature,
    'published',
    name,
    'Order ' || name || ' from Dao Seafood.'
  from product_seed
  on conflict (slug) do update
  set name = excluded.name,
      short_description = excluded.short_description,
      description = excluded.description,
      origin = excluded.origin,
      temperature_class = excluded.temperature_class,
      status = excluded.status,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description
  returning id, slug
)
insert into product_variants (product_id, sku, unit, list_price, sale_price, is_active)
select
  upserted_products.id,
  upper(replace(upserted_products.slug, '-', '_')),
  product_seed.unit,
  product_seed.price,
  product_seed.sale,
  true
from upserted_products
join product_seed on product_seed.slug = upserted_products.slug
on conflict (sku) do update
set unit = excluded.unit,
    list_price = excluded.list_price,
    sale_price = excluded.sale_price,
    is_active = true;

with product_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"slug":"alaska-lobster-500g","category":"best-sellers","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Alaska+Lobster"},
      {"slug":"korean-abalone-live","category":"best-sellers","image":"https://placehold.co/900x700/e8f5e9/0f172a?text=Korean+Abalone"},
      {"slug":"fresh-salmon-loin","category":"salmon","image":"https://placehold.co/900x700/fff3e0/0f172a?text=Fresh+Salmon"},
      {"slug":"green-lobster-live","category":"fresh-seafood","image":"https://placehold.co/900x700/e3f2fd/0f172a?text=Green+Lobster"},
      {"slug":"sashimi-mix-family","category":"sashimi","image":"https://placehold.co/900x700/fce4ec/0f172a?text=Sashimi+Mix"},
      {"slug":"shrimp-teriyaki-maki","category":"sashimi","image":"https://placehold.co/900x700/f3e5f5/0f172a?text=Shrimp+Maki"},
      {"slug":"peeled-white-shrimp","category":"frozen-seafood","image":"https://placehold.co/900x700/e1f5fe/0f172a?text=Peeled+Shrimp"},
      {"slug":"ready-meal-salmon-soy","category":"ready-to-eat","image":"https://placehold.co/900x700/fff8e1/0f172a?text=Salmon+Bowl"},
      {"slug":"clam-combo","category":"promotions","image":"https://placehold.co/900x700/e0f2f1/0f172a?text=Clam+Combo"},
      {"slug":"blue-crab-live","category":"shrimp-crab","image":"https://placehold.co/900x700/ede7f6/0f172a?text=Blue+Crab"}
    ]'::jsonb
  ) as product(slug text, category text, image text)
)
insert into product_categories (product_id, category_id)
select products.id, categories.id
from product_seed
join products on products.slug = product_seed.slug
join categories on categories.slug = product_seed.category
on conflict (product_id, category_id) do nothing;

with image_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"slug":"alaska-lobster-500g","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Alaska+Lobster"},
      {"slug":"korean-abalone-live","image":"https://placehold.co/900x700/e8f5e9/0f172a?text=Korean+Abalone"},
      {"slug":"fresh-salmon-loin","image":"https://placehold.co/900x700/fff3e0/0f172a?text=Fresh+Salmon"},
      {"slug":"green-lobster-live","image":"https://placehold.co/900x700/e3f2fd/0f172a?text=Green+Lobster"},
      {"slug":"sashimi-mix-family","image":"https://placehold.co/900x700/fce4ec/0f172a?text=Sashimi+Mix"},
      {"slug":"shrimp-teriyaki-maki","image":"https://placehold.co/900x700/f3e5f5/0f172a?text=Shrimp+Maki"},
      {"slug":"peeled-white-shrimp","image":"https://placehold.co/900x700/e1f5fe/0f172a?text=Peeled+Shrimp"},
      {"slug":"ready-meal-salmon-soy","image":"https://placehold.co/900x700/fff8e1/0f172a?text=Salmon+Bowl"},
      {"slug":"clam-combo","image":"https://placehold.co/900x700/e0f2f1/0f172a?text=Clam+Combo"},
      {"slug":"blue-crab-live","image":"https://placehold.co/900x700/ede7f6/0f172a?text=Blue+Crab"}
    ]'::jsonb
  ) as image(slug text, image text)
)
insert into product_images (product_id, url, alt_text, sort_order)
select products.id, image_seed.image, products.name, 0
from image_seed
join products on products.slug = image_seed.slug
where not exists (
  select 1
  from product_images
  where product_images.product_id = products.id
);

insert into cms_pages (page_key, title, status)
values ('home', 'Dao Seafood Home', 'published')
on conflict (page_key) do update
set title = excluded.title,
    status = excluded.status,
    updated_at = now();

with section_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"key":"hero","type":"hero","title":"Fresh seafood deals","subtitle":"Fast local delivery from Dao Seafood","layout":"hero_grid","sort":10},
      {"key":"service-strip","type":"service_strip","title":"Service promises","subtitle":"Delivery, loyalty, and support","layout":"icons","sort":20},
      {"key":"category-shortcuts","type":"category_shortcuts","title":"Shop by category","subtitle":"Popular seafood paths","layout":"chips","sort":30},
      {"key":"best-sellers","type":"product_rail","title":"Best-selling seafood","subtitle":"Customer favorites this week","layout":"grid","sort":40},
      {"key":"flash-sale","type":"flash_sale","title":"Flash seafood deals","subtitle":"Limited-time price drops","layout":"countdown_grid","sort":50},
      {"key":"budget-promo","type":"promo_band","title":"Fresh value picks from 29K","subtitle":"Everyday seafood for family meals","layout":"wide_banner","sort":60},
      {"key":"recommendations","type":"recommendation_tabs","title":"Recommended for you","subtitle":"Curated seafood collections","layout":"tabs","sort":70},
      {"key":"sashimi","type":"product_rail","title":"Sushi and sashimi","subtitle":"Chilled ready-to-eat selections","layout":"grid","sort":80},
      {"key":"fresh-seafood","type":"product_rail","title":"Fresh seafood","subtitle":"Live and fresh picks","layout":"grid","sort":90},
      {"key":"frozen-seafood","type":"product_rail","title":"Frozen seafood","subtitle":"Convenient freezer-ready items","layout":"grid","sort":100},
      {"key":"ready-to-eat","type":"product_rail","title":"Ready to eat","subtitle":"Prepared seafood meals","layout":"grid","sort":110},
      {"key":"partners","type":"partner_strip","title":"Dao Seafood partners","subtitle":"Trusted retail and payment partners","layout":"logo_grid","sort":120}
    ]'::jsonb
  ) as section(key text, type text, title text, subtitle text, layout text, sort integer)
)
insert into cms_sections (page_key, section_key, section_type, title, subtitle, layout, sort_order, metadata)
select 'home', key, type, title, subtitle, layout, sort, '{}'::jsonb
from section_seed
on conflict (page_key, section_key) do update
set section_type = excluded.section_type,
    title = excluded.title,
    subtitle = excluded.subtitle,
    layout = excluded.layout,
    sort_order = excluded.sort_order,
    metadata = excluded.metadata,
    updated_at = now();

with banner_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"section":"hero","title":"Buy 1 get 1 seafood week","subtitle":"Original Dao Seafood promotion artwork","image":"https://placehold.co/1200x520/0284c7/ffffff?text=Dao+Seafood+Hero","mobile":"https://placehold.co/720x720/0284c7/ffffff?text=Dao+Seafood","href":"/search?q=seafood","label":"Shop now","sort":10},
      {"section":"hero","title":"Sashimi lover combo","subtitle":"Prepared fresh daily","image":"https://placehold.co/600x250/f97316/ffffff?text=Sashimi+Combo","mobile":"https://placehold.co/720x480/f97316/ffffff?text=Sashimi","href":"/categories/sashimi","label":"View sashimi","sort":20},
      {"section":"hero","title":"Ready meal deals","subtitle":"Easy seafood dinners","image":"https://placehold.co/600x250/16a34a/ffffff?text=Ready+Meals","mobile":"https://placehold.co/720x480/16a34a/ffffff?text=Ready+Meals","href":"/categories/ready-to-eat","label":"See meals","sort":30},
      {"section":"budget-promo","title":"Value seafood from 29K","subtitle":"Daily family picks","image":"https://placehold.co/1400x320/0ea5e9/ffffff?text=Fresh+Value+Picks","mobile":"https://placehold.co/720x360/0ea5e9/ffffff?text=Value+Picks","href":"/categories/promotions","label":"Shop value picks","sort":10}
    ]'::jsonb
  ) as banner(section text, title text, subtitle text, image text, mobile text, href text, label text, sort integer)
)
insert into cms_banners (section_id, title, subtitle, image_url, mobile_image_url, cta_href, cta_label, sort_order)
select cms_sections.id, banner.title, banner.subtitle, banner.image, banner.mobile, banner.href, banner.label, banner.sort
from banner_seed banner
join cms_sections on cms_sections.page_key = 'home' and cms_sections.section_key = banner.section
where not exists (
  select 1
  from cms_banners
  where cms_banners.section_id = cms_sections.id
    and cms_banners.title = banner.title
);

insert into cms_navigation_items (placement, label, href, icon_key, sort_order)
values
  ('header', 'Best sellers', '/categories/best-sellers', 'star', 10),
  ('header', 'Promotions', '/categories/promotions', 'badge-percent', 20),
  ('header', 'Sashimi', '/categories/sashimi', 'fish', 30),
  ('header', 'Fresh seafood', '/categories/fresh-seafood', 'waves', 40),
  ('header', 'Frozen seafood', '/categories/frozen-seafood', 'snowflake', 50),
  ('sidebar', 'Best sellers', '/categories/best-sellers', 'star', 10),
  ('sidebar', 'Promotions', '/categories/promotions', 'badge-percent', 20),
  ('sidebar', 'Sushi and sashimi', '/categories/sashimi', 'fish', 30),
  ('sidebar', 'Fresh seafood', '/categories/fresh-seafood', 'waves', 40),
  ('sidebar', 'Frozen seafood', '/categories/frozen-seafood', 'snowflake', 50),
  ('sidebar', 'Ready to eat', '/categories/ready-to-eat', 'utensils', 60),
  ('mobile_dock', 'Category', '/search', 'menu', 10),
  ('mobile_dock', '8h - 21h', 'tel:19000098', 'phone', 20),
  ('mobile_dock', 'Messenger', '#messenger', 'message-circle', 30),
  ('mobile_dock', 'Zalo', '#zalo', 'send', 40),
  ('mobile_dock', 'Account', '/account/orders', 'user', 50)
on conflict do nothing;

insert into cms_footer_links (group_label, label, href, sort_order)
values
  ('Information', 'Cooking stories', '#content', 10),
  ('Information', 'Store system', '#stores', 20),
  ('Information', 'Loyalty program', '/account/loyalty', 30),
  ('Policies', 'Shipping policy', '#shipping', 10),
  ('Policies', 'Ordering guide', '#ordering', 20),
  ('Policies', 'Returns and complaints', '#returns', 30),
  ('Products', 'Shrimp', '/search?q=shrimp', 10),
  ('Products', 'Crab', '/search?q=crab', 20),
  ('Products', 'Salmon', '/search?q=salmon', 30)
on conflict do nothing;

insert into cms_brand_assets (asset_key, placement, image_url, alt_text, href, sort_order)
values
  ('payment-cod', 'payment', 'https://placehold.co/180x80/f8fafc/0f172a?text=COD', 'Cash on delivery', null, 10),
  ('payment-momo', 'payment', 'https://placehold.co/180x80/f8fafc/0f172a?text=MoMo', 'MoMo payment', null, 20),
  ('payment-vnpay', 'payment', 'https://placehold.co/180x80/f8fafc/0f172a?text=VNPAY', 'VNPAY payment', null, 30),
  ('partner-retail', 'partner', 'https://placehold.co/220x90/f8fafc/0f172a?text=Retail+Partner', 'Retail partner', null, 10),
  ('trust-fresh', 'trust', 'https://placehold.co/220x90/f8fafc/0f172a?text=Fresh+Daily', 'Fresh daily promise', null, 10)
on conflict (placement, asset_key) do update
set image_url = excluded.image_url,
    alt_text = excluded.alt_text,
    href = excluded.href,
    sort_order = excluded.sort_order,
    is_active = true;

with section_products as (
  select *
  from jsonb_to_recordset(
    '[
      {"section":"best-sellers","slug":"alaska-lobster-500g","sort":10,"badge":"Hot"},
      {"section":"best-sellers","slug":"korean-abalone-live","sort":20,"badge":"Sale"},
      {"section":"best-sellers","slug":"fresh-salmon-loin","sort":30,"badge":"Fresh"},
      {"section":"best-sellers","slug":"green-lobster-live","sort":40,"badge":"Live"},
      {"section":"flash-sale","slug":"alaska-lobster-500g","sort":10,"badge":"-33%"},
      {"section":"flash-sale","slug":"peeled-white-shrimp","sort":20,"badge":"-13%"},
      {"section":"flash-sale","slug":"blue-crab-live","sort":30,"badge":"-5%"},
      {"section":"recommendations","slug":"ready-meal-salmon-soy","sort":10,"badge":"Kitchen"},
      {"section":"recommendations","slug":"clam-combo","sort":20,"badge":"Combo"},
      {"section":"recommendations","slug":"sashimi-mix-family","sort":30,"badge":"Family"},
      {"section":"sashimi","slug":"sashimi-mix-family","sort":10,"badge":"Sashimi"},
      {"section":"sashimi","slug":"shrimp-teriyaki-maki","sort":20,"badge":"Ready"},
      {"section":"fresh-seafood","slug":"green-lobster-live","sort":10,"badge":"Live"},
      {"section":"fresh-seafood","slug":"blue-crab-live","sort":20,"badge":"Live"},
      {"section":"frozen-seafood","slug":"peeled-white-shrimp","sort":10,"badge":"Frozen"},
      {"section":"ready-to-eat","slug":"ready-meal-salmon-soy","sort":10,"badge":"Ready"}
    ]'::jsonb
  ) as item(section text, slug text, sort integer, badge text)
)
insert into cms_section_products (section_id, product_id, sort_order, badge_text)
select cms_sections.id, products.id, section_products.sort, section_products.badge
from section_products
join cms_sections on cms_sections.page_key = 'home' and cms_sections.section_key = section_products.section
join products on products.slug = section_products.slug
on conflict (section_id, product_id) do update
set sort_order = excluded.sort_order,
    badge_text = excluded.badge_text;
```

- [ ] **Step 2: Verify the seed is idempotent**

Run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Expected: both runs exit 0.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore: seed storefront merchandising content"
```

---

### Task 3: Add CMS Query Layer

**Files:**
- Create: `src/features/cms/types.ts`
- Create: `src/features/cms/queries.ts`
- Create: `src/features/cms/queries.test.ts`

- [ ] **Step 1: Write mapper tests**

Create `src/features/cms/queries.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapCmsProductCardRow, sortBySortOrder } from "./queries";

describe("CMS query helpers", () => {
  it("sorts rows by sort_order", () => {
    expect(
      sortBySortOrder([
        { sort_order: 20, label: "B" },
        { sort_order: 10, label: "A" },
      ]),
    ).toEqual([
      { sort_order: 10, label: "A" },
      { sort_order: 20, label: "B" },
    ]);
  });

  it("maps CMS product rows into dense product cards", () => {
    const card = mapCmsProductCardRow({
      badge_text: "Hot",
      products: {
        id: "p1",
        slug: "alaska-lobster-500g",
        name: "Alaska lobster 500g",
        product_images: [{ url: "https://placehold.co/lobster", alt_text: "Lobster", sort_order: 0 }],
        product_variants: [
          {
            id: "v1",
            sku: "ALASKA_LOBSTER_500G",
            unit: "1 con",
            option_summary: null,
            list_price: 745000,
            sale_price: 499000,
            is_active: true,
          },
        ],
      },
    });

    expect(card).toMatchObject({
      id: "p1",
      slug: "alaska-lobster-500g",
      name: "Alaska lobster 500g",
      imageUrl: "https://placehold.co/lobster",
      price: 499000,
      compareAtPrice: 745000,
      badgeText: "Hot",
      unitLabel: "1 con",
    });
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm vitest run src/features/cms/queries.test.ts
```

Expected: fails because `src/features/cms/queries.ts` does not exist.

- [ ] **Step 3: Add CMS types**

Create `src/features/cms/types.ts`:

```ts
import type { ProductCard } from "@/src/features/catalog/types";

export type CmsNavigationPlacement = "header" | "sidebar" | "mobile_dock" | "footer";

export type CmsSectionType =
  | "hero"
  | "service_strip"
  | "category_shortcuts"
  | "product_rail"
  | "flash_sale"
  | "promo_band"
  | "recommendation_tabs"
  | "partner_strip"
  | "content_highlights"
  | "footer";

export type CmsBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
};

export type CmsProductCard = ProductCard & {
  badgeText: string | null;
  unitLabel: string | null;
  soldLabel: string;
};

export type CmsSection = {
  id: string;
  key: string;
  type: CmsSectionType;
  title: string | null;
  subtitle: string | null;
  layout: string;
  sortOrder: number;
  metadata: Record<string, unknown>;
  banners: CmsBanner[];
  products: CmsProductCard[];
};

export type CmsNavigationItem = {
  id: string;
  placement: CmsNavigationPlacement;
  label: string;
  href: string;
  iconKey: string | null;
  sortOrder: number;
};

export type CmsFooterLink = {
  id: string;
  groupLabel: string;
  label: string;
  href: string;
  sortOrder: number;
};

export type CmsBrandAsset = {
  id: string;
  assetKey: string;
  placement: "partner" | "payment" | "trust" | "brand";
  imageUrl: string;
  altText: string;
  href: string | null;
  sortOrder: number;
};

export type StorefrontChrome = {
  headerNav: CmsNavigationItem[];
  sidebarNav: CmsNavigationItem[];
  mobileDock: CmsNavigationItem[];
  footerLinks: CmsFooterLink[];
  paymentAssets: CmsBrandAsset[];
  partnerAssets: CmsBrandAsset[];
  trustAssets: CmsBrandAsset[];
};

export type HomePageContent = {
  sections: CmsSection[];
};
```

- [ ] **Step 4: Add CMS query helpers**

Create `src/features/cms/queries.ts` with exported `sortBySortOrder`, `mapCmsProductCardRow`, `getStorefrontChrome`, and `getHomePageContent`. Use the table names from Task 1 and keep all returned arrays sorted by `sort_order`.

The key implementation contract:

```ts
export async function getHomePageContent(client: SupabaseClient): Promise<HomePageContent>;
export async function getStorefrontChrome(client: SupabaseClient): Promise<StorefrontChrome>;
```

`getHomePageContent` must select:

```text
cms_sections:
  id, section_key, section_type, title, subtitle, layout, sort_order, metadata
  cms_banners: id, title, subtitle, image_url, mobile_image_url, cta_label, cta_href, sort_order
  cms_section_products: sort_order, badge_text
    products:
      id, slug, name
      product_images: url, alt_text, sort_order
      product_variants: id, sku, unit, option_summary, list_price, sale_price, is_active
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm vitest run src/features/cms/queries.test.ts
pnpm test
```

Expected: CMS tests and existing Vitest suite pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/cms
git commit -m "feat: add cms storefront query layer"
```

---

### Task 4: Add Formatting Helpers And Image Configuration

**Files:**
- Create: `src/lib/format.test.ts`
- Create: `src/lib/format.ts`
- Modify: `next.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Write formatting tests**

Create `src/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateDiscountPercent, formatVnd } from "./format";

describe("format helpers", () => {
  it("formats VND prices with the existing d suffix", () => {
    expect(formatVnd(499000)).toBe("499,000d");
  });

  it("calculates discount percentage from compare-at price", () => {
    expect(calculateDiscountPercent(499000, 745000)).toBe(33);
  });

  it("returns null when there is no discount", () => {
    expect(calculateDiscountPercent(745000, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm vitest run src/lib/format.test.ts
```

Expected: fails because `src/lib/format.ts` does not exist.

- [ ] **Step 3: Add formatting helpers**

Create `src/lib/format.ts`:

```ts
export function formatVnd(value: number): string {
  return `${value.toLocaleString("vi-VN")}d`;
}

export function calculateDiscountPercent(
  price: number,
  compareAtPrice: number | null,
): number | null {
  if (!compareAtPrice || compareAtPrice <= price) {
    return null;
  }

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
```

- [ ] **Step 4: Allow neutral image placeholders**

Modify `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
```

- [ ] **Step 5: Replace global CSS with storefront/admin tokens**

Modify `app/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: #f5f7f8;
  --foreground: #172026;
  --storefront-primary: #0088a8;
  --storefront-primary-dark: #006b85;
  --storefront-accent: #f97316;
  --storefront-danger: #e11d48;
  --admin-sidebar: #101828;
  --admin-surface: #ffffff;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--background);
}

body {
  min-width: 320px;
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

button,
a,
input,
select,
textarea {
  letter-spacing: 0;
}

img {
  max-width: 100%;
}
```

- [ ] **Step 6: Verify**

Run:

```bash
pnpm vitest run src/lib/format.test.ts
pnpm lint
pnpm test
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts next.config.ts app/globals.css
git commit -m "feat: add ui formatting foundations"
```

---

### Task 5: Build Storefront Chrome Components

**Files:**
- Create: `components/storefront/storefront-header.tsx`
- Create: `components/storefront/category-nav.tsx`
- Create: `components/storefront/category-sidebar.tsx`
- Create: `components/storefront/mobile-storefront-dock.tsx`
- Create: `components/storefront/floating-contact-actions.tsx`
- Create: `components/storefront/storefront-footer.tsx`
- Modify: `tests/e2e/storefront-checkout.spec.ts`

- [ ] **Step 1: Update E2E expectations for storefront chrome**

Modify the first test in `tests/e2e/storefront-checkout.spec.ts` so `/` expects:

```ts
await expect(page.getByRole("banner")).toBeVisible();
await expect(page.getByRole("link", { name: "Dao Seafood" })).toBeVisible();
await expect(page.getByPlaceholder("Search seafood")).toBeVisible();
await expect(page.getByText("1900 0098")).toBeVisible();
await expect(page.getByRole("contentinfo")).toBeVisible();
```

- [ ] **Step 2: Run Playwright and verify failure**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected: fails because storefront chrome does not exist yet.

- [ ] **Step 3: Add `StorefrontHeader`**

Create `components/storefront/storefront-header.tsx` as a server component with props:

```ts
import Link from "next/link";
import { Search, ShoppingCart, UserRound, Phone } from "lucide-react";
import type { CmsNavigationItem } from "@/src/features/cms/types";

type StorefrontHeaderProps = {
  navItems: CmsNavigationItem[];
};
```

Required rendered elements:

- `header` landmark.
- Brand link text `Dao Seafood` to `/`.
- Hotline link `1900 0098` to `tel:19000098`.
- Search form with placeholder `Search seafood` and action `/search`.
- Account link to `/account/orders`.
- Cart link to `/cart`.
- Desktop nav row using `navItems`.

- [ ] **Step 4: Add navigation/sidebar/dock/footer/contact components**

Create each component with typed props from `src/features/cms/types.ts`:

- `CategoryNav({ items })`
- `CategorySidebar({ items })`
- `MobileStorefrontDock({ items })`
- `FloatingContactActions()`
- `StorefrontFooter({ footerLinks, paymentAssets, partnerAssets, trustAssets })`

Required labels:

- Mobile dock renders `Category`, `8h - 21h`, `Messenger`, `Zalo`, `Account`.
- Floating contact actions render `Messenger`, `Zalo`, `Hotline`.
- Footer renders `Information`, `Policies`, `Products`, and company text `Dao Seafood Commerce`.

- [ ] **Step 5: Wire chrome into the homepage temporarily**

Modify `app/(storefront)/page.tsx` to fetch `getStorefrontChrome(client)` and render:

```tsx
<StorefrontHeader navItems={chrome.headerNav} />
<FloatingContactActions />
<MobileStorefrontDock items={chrome.mobileDock} />
<StorefrontFooter
  footerLinks={chrome.footerLinks}
  paymentAssets={chrome.paymentAssets}
  partnerAssets={chrome.partnerAssets}
  trustAssets={chrome.trustAssets}
/>
```

Keep a simple main section between header and footer until Task 6 replaces it.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm lint
pnpm test
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add components/storefront 'app/(storefront)/page.tsx' tests/e2e/storefront-checkout.spec.ts
git commit -m "feat: add data-backed storefront chrome"
```

---

### Task 6: Build Homepage Merchandising

**Files:**
- Create: `components/storefront/hero-merchandising-grid.tsx`
- Create: `components/storefront/service-strip.tsx`
- Create: `components/storefront/promo-band.tsx`
- Create: `components/storefront/product-rail.tsx`
- Modify: `components/storefront/product-card.tsx`
- Modify: `components/storefront/product-grid.tsx`
- Modify: `app/(storefront)/page.tsx`
- Modify: `tests/e2e/storefront-checkout.spec.ts`

- [ ] **Step 1: Update homepage E2E expectations**

In `tests/e2e/storefront-checkout.spec.ts`, replace the old home heading expectation with:

```ts
await expect(page.getByRole("heading", { name: "Fresh seafood deals" })).toBeVisible();
await expect(page.getByRole("heading", { name: "Best-selling seafood" })).toBeVisible();
await expect(page.getByRole("heading", { name: "Flash seafood deals" })).toBeVisible();
await expect(page.getByText("Fresh value picks from 29K")).toBeVisible();
```

- [ ] **Step 2: Run Playwright and verify failure**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected: fails because homepage merchandising components do not exist yet.

- [ ] **Step 3: Upgrade product cards**

Modify `components/storefront/product-card.tsx` to accept `ProductCard | CmsProductCard` and render:

- sale percent badge from `calculateDiscountPercent`
- `badgeText`
- product image
- product name
- price from `formatVnd`
- compare-at price when present
- `soldLabel`
- small orange add button with accessible label `Add ${product.name} to cart`

- [ ] **Step 4: Add homepage section components**

Create:

- `HeroMerchandisingGrid({ section })`
- `ServiceStrip()`
- `PromoBand({ section })`
- `ProductRail({ section })`

Rules:

- `HeroMerchandisingGrid` uses the first banner as the large banner and the remaining banners as compact tiles.
- `ProductRail` renders a section title, optional subtitle, `View more` link, and dense product grid.
- `PromoBand` renders the first banner as a wide responsive image link.
- `ServiceStrip` renders four items: `2H delivery`, `Loyalty`, `New products`, `Best sellers`.

- [ ] **Step 5: Compose the Supabase-backed homepage**

Modify `app/(storefront)/page.tsx`:

```tsx
export const dynamic = "force-dynamic";
```

Fetch both:

```ts
const client = await createServerClient();
const [chrome, home] = await Promise.all([
  getStorefrontChrome(client),
  getHomePageContent(client),
]);
```

Render sections by `section.type`. Unknown section types should be skipped by returning `null`.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm lint
pnpm test
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add 'app/(storefront)/page.tsx' components/storefront tests/e2e/storefront-checkout.spec.ts
git commit -m "feat: build supabase-backed homepage merchandising"
```

---

### Task 7: Polish Category, Search, And Product Detail Pages

**Files:**
- Modify: `src/features/catalog/types.ts`
- Modify: `src/features/catalog/queries.ts`
- Create: `components/storefront/product-detail-view.tsx`
- Modify: `app/(storefront)/categories/[slug]/page.tsx`
- Modify: `app/(storefront)/search/page.tsx`
- Modify: `app/(storefront)/products/[slug]/page.tsx`
- Modify: `tests/e2e/storefront-checkout.spec.ts`

- [ ] **Step 1: Add listing/PDP E2E expectations**

Add expectations:

```ts
await page.goto("/search?q=salmon");
await expect(page.getByRole("heading", { name: /Search results/i })).toBeVisible();
await expect(page.getByText("Sort")).toBeVisible();

await page.goto("/categories/sashimi");
await expect(page.getByRole("heading", { name: /sashimi/i })).toBeVisible();
await expect(page.getByText("Filter")).toBeVisible();
```

- [ ] **Step 2: Run Playwright and verify failure**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected: fails because listing page chrome/filter text is not implemented.

- [ ] **Step 3: Extend catalog card types**

Modify `src/features/catalog/types.ts` so `ProductCard` includes:

```ts
unitLabel: string | null;
badgeText?: string | null;
soldLabel?: string;
```

Keep existing fields backward compatible.

- [ ] **Step 4: Update catalog mappers**

Modify `src/features/catalog/queries.ts` so product cards set:

```ts
unitLabel: row.unit ?? null;
soldLabel: "Da ban: 1k+";
```

Update RPC row types and queries to include a representative variant unit.

- [ ] **Step 5: Add `ProductDetailView`**

Create `components/storefront/product-detail-view.tsx` with props:

```ts
import type { ProductDetail } from "@/src/features/catalog/types";

type ProductDetailViewProps = {
  product: ProductDetail;
};
```

Render image gallery, title, temperature class, origin, variant selector, price, quantity controls, `Add to cart`, `Buy now`, trust/service messages, description, and related-products container heading.

- [ ] **Step 6: Update listing pages**

Modify category and search pages to render:

- `StorefrontHeader`
- `CategoryNav`
- filter/sort toolbar with visible `Filter` and `Sort`
- `ProductGrid`
- `MobileStorefrontDock`
- `StorefrontFooter`

Fetch `getStorefrontChrome(client)` on both pages.

- [ ] **Step 7: Update product detail page**

Modify `app/(storefront)/products/[slug]/page.tsx` to render storefront chrome and `ProductDetailView`.

- [ ] **Step 8: Verify**

Run:

```bash
pnpm lint
pnpm test
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/features/catalog components/storefront/product-detail-view.tsx 'app/(storefront)/categories/[slug]/page.tsx' 'app/(storefront)/search/page.tsx' 'app/(storefront)/products/[slug]/page.tsx' tests/e2e/storefront-checkout.spec.ts
git commit -m "feat: polish storefront listing and product pages"
```

---

### Task 8: Polish Cart And Checkout UI

**Files:**
- Modify: `components/storefront/cart-line-item.tsx`
- Create: `components/storefront/cart-summary.tsx`
- Create: `components/storefront/checkout-panel.tsx`
- Modify: `components/storefront/checkout-form.tsx`
- Modify: `app/(storefront)/cart/page.tsx`
- Modify: `app/(storefront)/checkout/page.tsx`
- Modify: `tests/e2e/storefront-checkout.spec.ts`

- [ ] **Step 1: Update E2E expectations**

Update cart and checkout expectations:

```ts
await page.goto("/cart");
await expect(page.getByRole("heading", { name: "Shopping cart" })).toBeVisible();
await expect(page.getByText("Order minimum notice")).toBeVisible();
await expect(page.getByRole("link", { name: "Checkout" })).toBeVisible();

await page.goto("/checkout");
await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
await expect(page.getByLabel("Receiver name")).toBeVisible();
await expect(page.getByLabel("Payment method")).toBeVisible();
await expect(page.getByRole("button", { name: "Place order" })).toBeVisible();
```

- [ ] **Step 2: Run Playwright and verify failure**

Run:

```bash
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected: fails because current labels still use the old sparse UI.

- [ ] **Step 3: Add cart summary**

Create `components/storefront/cart-summary.tsx` with props:

```ts
import type { CartTotals } from "@/src/features/cart/types";

type CartSummaryProps = {
  totals: CartTotals;
};
```

Render subtotal, discount, shipping, total, minimum order notice, and checkout link.

- [ ] **Step 4: Add checkout panel**

Create `components/storefront/checkout-panel.tsx` with props:

```ts
type CheckoutPanelProps = {
  children: React.ReactNode;
  title: string;
};
```

Use it to group delivery info, payment info, and order summary without nesting cards inside cards.

- [ ] **Step 5: Update cart and checkout pages**

Both pages must fetch `getStorefrontChrome(client)` and render the storefront header/footer/mobile dock. Cart keeps using `calculateCartTotals`. Checkout keeps using the existing form shape and route handler contract.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm lint
pnpm test
pnpm exec playwright test tests/e2e/storefront-checkout.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add components/storefront 'app/(storefront)/cart/page.tsx' 'app/(storefront)/checkout/page.tsx' tests/e2e/storefront-checkout.spec.ts
git commit -m "feat: polish cart and checkout storefront ui"
```

---

### Task 9: Build Admin Shell Components

**Files:**
- Create: `components/admin/status-chip.tsx`
- Create: `components/admin/metric-tile.tsx`
- Create: `components/admin/empty-state.tsx`
- Create: `components/admin/filter-bar.tsx`
- Create: `components/admin/admin-page-header.tsx`
- Create: `components/admin/admin-shell.tsx`
- Modify: `components/admin/admin-nav.tsx`
- Rename/modify: `components/admin/data-table.tsx` to `components/admin/admin-data-table.tsx`
- Modify: `app/admin/layout.tsx`
- Modify: `tests/e2e/admin-order-flow.spec.ts`

- [ ] **Step 1: Update admin E2E expectations**

Update `tests/e2e/admin-order-flow.spec.ts`:

```ts
await page.goto("/admin");
await expect(page.getByRole("heading", { name: "Operations dashboard" })).toBeVisible();
await expect(page.getByText("Branch context")).toBeVisible();
await expect(page.getByRole("navigation", { name: "Admin modules" })).toBeVisible();
await expect(page.getByText("Open orders")).toBeVisible();
```

- [ ] **Step 2: Run Playwright and verify failure**

Run:

```bash
pnpm exec playwright test tests/e2e/admin-order-flow.spec.ts
```

Expected: fails because admin shell components do not exist yet.

- [ ] **Step 3: Add admin primitives**

Create:

- `StatusChip({ value, tone })`
- `MetricTile({ label, value, detail, icon })`
- `EmptyState({ title, description })`
- `FilterBar({ children })`
- `AdminPageHeader({ title, description, action })`
- `AdminShell({ children })`

Use compact spacing, 8px or smaller radii, and restrained colors.

- [ ] **Step 4: Upgrade admin navigation and table**

Replace `DataTable` with `AdminDataTable` that supports:

```ts
type AdminDataTableColumn<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
};
```

Keep a compatibility export:

```ts
export { AdminDataTable as DataTable };
```

This keeps existing pages working while new pages move to `AdminDataTable`.

- [ ] **Step 5: Wire admin shell**

Modify `app/admin/layout.tsx` to render `AdminShell` around `children`.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm lint
pnpm test
pnpm exec playwright test tests/e2e/admin-order-flow.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add components/admin app/admin/layout.tsx tests/e2e/admin-order-flow.spec.ts
git commit -m "feat: add admin operations shell"
```

---

### Task 10: Add Admin Data Loaders And Dashboard

**Files:**
- Create: `src/features/admin/dashboard.ts`
- Create: `src/features/orders/queries.ts`
- Create: `src/features/inventory/queries.ts`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/orders/page.tsx`
- Modify: `app/admin/products/page.tsx`
- Modify: `app/admin/inventory/page.tsx`
- Modify: `tests/e2e/admin-order-flow.spec.ts`

- [ ] **Step 1: Add dashboard unit tests**

Create a test file if needed at `src/features/admin/dashboard.test.ts` that verifies metric calculation from simple row counts:

```ts
import { describe, expect, it } from "vitest";
import { createDashboardMetrics } from "./dashboard";

describe("createDashboardMetrics", () => {
  it("formats operations metrics", () => {
    expect(
      createDashboardMetrics({
        openOrders: 2,
        lowStockSkus: 3,
        pendingRefunds: 1,
        openComplaints: 4,
        purchaseOrders: 5,
        revenueToday: 1250000,
      }),
    ).toEqual([
      { label: "Open orders", value: "2", detail: "Needs review" },
      { label: "Low stock SKUs", value: "3", detail: "Below threshold" },
      { label: "Pending refunds", value: "1", detail: "Finance queue" },
      { label: "Open complaints", value: "4", detail: "Support queue" },
      { label: "Purchase orders", value: "5", detail: "Procurement" },
      { label: "Sales today", value: "1,250,000d", detail: "Completed orders" },
    ]);
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
pnpm vitest run src/features/admin/dashboard.test.ts
```

Expected: fails because `createDashboardMetrics` does not exist.

- [ ] **Step 3: Implement dashboard helper**

Create `src/features/admin/dashboard.ts` with `createDashboardMetrics` and `getAdminDashboardMetrics(client)`. Use Supabase counts for orders, stock, refunds, complaints, and purchase orders. Use `formatVnd` for revenue.

- [ ] **Step 4: Add orders and inventory query helpers**

Create:

- `src/features/orders/queries.ts` with `getAdminOrderRows(client)`
- `src/features/inventory/queries.ts` with `getAdminInventoryRows(client)`

Each helper returns already formatted row objects for admin tables.

- [ ] **Step 5: Wire dashboard and static admin pages**

Modify:

- `app/admin/page.tsx` to fetch metrics from Supabase and render `MetricTile`.
- `app/admin/orders/page.tsx` to read orders from Supabase.
- `app/admin/products/page.tsx` to read products from Supabase.
- `app/admin/inventory/page.tsx` to read inventory rows from Supabase.

Use `requireAdminPermission` where the page is permission scoped.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm vitest run src/features/admin/dashboard.test.ts
pnpm lint
pnpm test
pnpm exec playwright test tests/e2e/admin-order-flow.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/features/admin src/features/orders src/features/inventory app/admin/page.tsx app/admin/orders/page.tsx app/admin/products/page.tsx app/admin/inventory/page.tsx tests/e2e/admin-order-flow.spec.ts
git commit -m "feat: wire admin dashboard and core tables"
```

---

### Task 11: Polish Remaining Admin Modules

**Files:**
- Modify: `app/admin/purchase-orders/page.tsx`
- Modify: `app/admin/refunds/page.tsx`
- Modify: `app/admin/complaints/page.tsx`
- Modify: `app/admin/content/page.tsx`
- Modify: `app/admin/reports/page.tsx`
- Modify: `tests/e2e/admin-order-flow.spec.ts`

- [ ] **Step 1: Update admin module E2E expectations**

Add checks for visible filters/status summaries:

```ts
await page.goto("/admin/purchase-orders");
await expect(page.getByText("Procurement queue")).toBeVisible();

await page.goto("/admin/refunds");
await expect(page.getByText("Finance queue")).toBeVisible();

await page.goto("/admin/complaints");
await expect(page.getByText("Support queue")).toBeVisible();

await page.goto("/admin/content");
await expect(page.getByText("CMS sections")).toBeVisible();

await page.goto("/admin/reports");
await expect(page.getByText("Last 7 days")).toBeVisible();
```

- [ ] **Step 2: Run Playwright and verify failure**

Run:

```bash
pnpm exec playwright test tests/e2e/admin-order-flow.spec.ts
```

Expected: fails because the remaining modules still use sparse headings/tables.

- [ ] **Step 3: Upgrade procurement/refund/complaint pages**

Use `AdminPageHeader`, `FilterBar`, `StatusChip`, and `AdminDataTable` in:

- `app/admin/purchase-orders/page.tsx`
- `app/admin/refunds/page.tsx`
- `app/admin/complaints/page.tsx`

Keep their existing Supabase data loaders and permission behavior.

- [ ] **Step 4: Wire content page to CMS tables**

Modify `app/admin/content/page.tsx` to read:

- `cms_pages`
- `cms_sections`
- `cms_banners`
- `cms_navigation_items`
- `cms_footer_links`
- `cms_brand_assets`

Render grouped compact tables with labels `CMS pages`, `CMS sections`, `Banners`, `Navigation`, `Footer links`, and `Brand assets`.

- [ ] **Step 5: Polish reports page**

Keep existing report RPC wrappers. Add:

- `AdminPageHeader`
- visible date range label `Last 7 days`
- compact section grid for report tables
- `StatusChip` where status values are displayed

- [ ] **Step 6: Verify**

Run:

```bash
pnpm lint
pnpm test
pnpm exec playwright test tests/e2e/admin-order-flow.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add app/admin tests/e2e/admin-order-flow.spec.ts
git commit -m "feat: polish admin operations modules"
```

---

### Task 12: Responsive Screenshot And Final Verification

**Files:**
- Modify: `tests/e2e/storefront-checkout.spec.ts`
- Modify: `tests/e2e/admin-order-flow.spec.ts`

- [ ] **Step 1: Add screenshot smoke checks**

Add a desktop and mobile viewport pass to storefront E2E:

```ts
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1200 },
]) {
  test(`storefront homepage renders at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Fresh seafood deals" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await page.screenshot({ path: `test-results/storefront-home-${viewport.width}.png`, fullPage: true });
  });
}
```

Add an admin desktop screenshot check:

```ts
test("admin dashboard renders dense desktop layout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Operations dashboard" })).toBeVisible();
  await page.screenshot({ path: "test-results/admin-dashboard-desktop.png", fullPage: true });
});
```

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm lint
pnpm test
pnpm exec playwright test
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Manual screenshot review**

Open generated screenshots and verify:

- Storefront is nonblank on mobile and desktop.
- Header, product cards, footer, and mobile dock do not overlap.
- Desktop homepage has dense product rails and promo bands.
- Admin dashboard has a sidebar, topbar, metric tiles, and compact tables.
- Text fits inside buttons, product cards, nav items, and table cells.

- [ ] **Step 4: Commit final E2E updates**

```bash
git add tests/e2e
git commit -m "test: add responsive ui smoke coverage"
```

---

## Execution Notes

- If SQL integration commands need a database URL, start the local stack with `docker compose up --build` or point `DATABASE_URL` to the local Supabase/Postgres database.
- If Playwright fails because seeded data is unavailable, run migrations and `supabase/seed.sql` before rerunning Playwright.
- Keep the existing uncommitted `AGENTS.md` change separate unless the user asks to include it.
