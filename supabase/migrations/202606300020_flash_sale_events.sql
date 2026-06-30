-- supabase/migrations/202606300020_flash_sale_events.sql

create table flash_sale_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_pct integer not null check (discount_pct between 1 and 99),
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint fse_end_after_start check (end_at > start_at)
);

create table flash_sale_event_products (
  event_id uuid not null references flash_sale_events(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (event_id, product_id)
);

create or replace view active_flash_sale_v as
select *
from flash_sale_events
where is_active = true
  and start_at <= now()
  and end_at > now()
order by end_at asc
limit 1;

alter table flash_sale_events enable row level security;
alter table flash_sale_event_products enable row level security;

-- Anyone can read (storefront needs it)
create policy "Public read flash_sale_events"
  on flash_sale_events for select using (true);

-- Only admins can write
create policy "Admin write flash_sale_events"
  on flash_sale_events for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

create policy "Public read flash_sale_event_products"
  on flash_sale_event_products for select using (true);

create policy "Admin write flash_sale_event_products"
  on flash_sale_event_products for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));
