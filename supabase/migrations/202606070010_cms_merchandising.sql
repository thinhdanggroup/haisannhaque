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
  created_at timestamptz not null default now(),
  unique (placement, label, href)
);

create table cms_footer_links (
  id uuid primary key default gen_random_uuid(),
  group_label text not null,
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (group_label, label, href)
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
create index cms_section_products_product_id_idx on cms_section_products (product_id);
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
  and exists (
    select 1
    from products
    where products.id = cms_section_products.product_id
      and products.status = 'published'
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
