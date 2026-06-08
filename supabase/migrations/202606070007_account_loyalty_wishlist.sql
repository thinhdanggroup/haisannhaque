alter table customers
add column if not exists loyalty_points integer not null default 0;

create table wishlists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references customers(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references wishlists(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

create table loyalty_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  min_points integer not null default 0,
  earn_rate numeric(10,2) not null default 1000,
  created_at timestamptz not null default now()
);

create table loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  points_delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create unique index loyalty_ledger_order_completed_idx
on loyalty_ledger (order_id)
where reason = 'order_completed';

alter table wishlists enable row level security;
alter table wishlist_items enable row level security;
alter table loyalty_tiers enable row level security;
alter table loyalty_ledger enable row level security;

create policy "customers can read own wishlist"
on wishlists for select
using (
  exists (
    select 1
    from customers
    where customers.id = wishlists.customer_id
      and customers.user_id = auth.uid()
  )
);

create policy "customers can read own wishlist items"
on wishlist_items for select
using (
  exists (
    select 1
    from wishlists
    join customers on customers.id = wishlists.customer_id
    where wishlists.id = wishlist_items.wishlist_id
      and customers.user_id = auth.uid()
  )
);

create policy "customers can read loyalty tiers"
on loyalty_tiers for select
using (true);

create policy "customers can read own loyalty ledger"
on loyalty_ledger for select
using (
  exists (
    select 1
    from customers
    where customers.id = loyalty_ledger.customer_id
      and customers.user_id = auth.uid()
  )
);

create policy "admins can manage wishlists"
on wishlists for all
using (is_admin())
with check (is_admin());

create policy "admins can manage wishlist items"
on wishlist_items for all
using (is_admin())
with check (is_admin());

create policy "admins can manage loyalty tiers"
on loyalty_tiers for all
using (is_admin())
with check (is_admin());

create policy "admins can manage loyalty ledger"
on loyalty_ledger for all
using (is_admin())
with check (is_admin());

insert into loyalty_tiers (code, name, min_points, earn_rate)
values
  ('standard', 'Standard', 0, 1000),
  ('silver', 'Silver', 1000, 900),
  ('gold', 'Gold', 5000, 800)
on conflict (code) do nothing;

create or replace function award_loyalty_points(input_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order orders%rowtype;
  awarded_points integer;
begin
  select *
  into target_order
  from orders
  where id = input_order_id
    and order_status = 'completed'
    and customer_id is not null;

  if not found then
    return 0;
  end if;

  if exists (
    select 1
    from loyalty_ledger
    where order_id = input_order_id
      and reason = 'order_completed'
  ) then
    return 0;
  end if;

  awarded_points := floor(target_order.grand_total / 1000);

  if awarded_points <= 0 then
    return 0;
  end if;

  insert into loyalty_ledger (customer_id, order_id, points_delta, reason)
  values (target_order.customer_id, target_order.id, awarded_points, 'order_completed');

  update customers
  set loyalty_points = loyalty_points + awarded_points
  where id = target_order.customer_id;

  return awarded_points;
end;
$$;
