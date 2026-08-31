-- Tags categories created by the shop sync job, and lets an admin map a
-- ShopeeFood category name onto one of the site's real (already-nav-linked)
-- categories instead of leaving synced products stuck on an orphaned
-- auto-created placeholder category.
alter table categories
  add column external_source text;

create table shop_sync_category_mappings (
  id uuid primary key default gen_random_uuid(),
  external_source text not null,
  external_category_name text not null,
  category_id uuid not null references categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (external_source, external_category_name)
);

alter table shop_sync_category_mappings enable row level security;

create policy "Admins manage shop_sync_category_mappings" on shop_sync_category_mappings
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));
