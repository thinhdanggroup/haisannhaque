-- Tag products created/owned by an external sync source, and cache the
-- last-synced source image URL so the sync service can skip re-downloading
-- an unchanged image.
alter table products
  add column external_source text,
  add column external_id text,
  add column external_image_source_url text;

create unique index products_external_source_id_key
  on products (external_source, external_id)
  where external_source is not null;

-- Singleton-style shop info owned entirely by the sync job. logo_source_url
-- and cover_image_source_url cache the last-seen ShopeeFood image URLs
-- (for skip-if-unchanged); logo_url/cover_image_url are the re-hosted
-- Supabase Storage URLs actually shown on the site.
create table shop_profile (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  name text not null,
  logo_url text,
  logo_source_url text,
  cover_image_url text,
  cover_image_source_url text,
  description text,
  address text,
  opening_hours text,
  updated_at timestamptz not null default now()
);

create table shop_sync_settings (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_url text not null,
  enabled boolean not null default false,
  cron_expression text not null default '0 3 * * *',
  target_catalog boolean not null default true,
  target_shop_info boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- One settings row per source; Task 11's admin action upserts onto this.
create unique index shop_sync_settings_source_key on shop_sync_settings (source);

create table shop_sync_runs (
  id uuid primary key default gen_random_uuid(),
  settings_id uuid not null references shop_sync_settings(id) on delete cascade,
  status text not null default 'running' check (status in ('running','success','failed')),
  trigger text not null default 'scheduled' check (trigger in ('scheduled','manual')),
  items_created integer not null default 0,
  items_updated integer not null default 0,
  items_archived integer not null default 0,
  items_errored integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table shop_sync_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references shop_sync_runs(id) on delete cascade,
  external_id text not null,
  product_id uuid references products(id) on delete set null,
  action text not null check (action in ('created','updated','archived','skipped','error')),
  message text
);

alter table shop_profile enable row level security;
alter table shop_sync_settings enable row level security;
alter table shop_sync_runs enable row level security;
alter table shop_sync_run_items enable row level security;

create policy "Admins manage shop_profile" on shop_profile
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

create policy "Admins manage shop_sync_settings" on shop_sync_settings
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

create policy "Admins manage shop_sync_runs" on shop_sync_runs
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

create policy "Admins manage shop_sync_run_items" on shop_sync_run_items
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));
