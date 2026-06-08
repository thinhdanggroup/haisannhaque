alter table profiles enable row level security;
alter table admin_roles enable row level security;
alter table user_admin_roles enable row level security;
alter table customers enable row level security;
alter table addresses enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table product_categories enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table warehouses enable row level security;
alter table lots enable row level security;
alter table stock_ledger_entries enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table stock_reservations enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_admin_roles
    where user_id = auth.uid()
  );
$$;

create or replace function has_admin_permission(input_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with role_permissions(role_name, permission) as (
    values
      ('super_admin', '*'),
      ('catalog_manager', 'products:read'),
      ('catalog_manager', 'products:create'),
      ('catalog_manager', 'products:update'),
      ('catalog_manager', 'categories:update'),
      ('marketing', 'cms:update'),
      ('marketing', 'promotions:update'),
      ('customer_service', 'orders:read'),
      ('customer_service', 'orders:update'),
      ('customer_service', 'customers:read'),
      ('customer_service', 'complaints:read'),
      ('customer_service', 'complaints:update'),
      ('warehouse', 'inventory:read'),
      ('warehouse', 'inventory:update'),
      ('warehouse', 'orders:fulfill'),
      ('procurement', 'purchase_orders:read'),
      ('procurement', 'purchase_orders:update'),
      ('procurement', 'suppliers:update'),
      ('finance', 'payments:read'),
      ('finance', 'refunds:create'),
      ('finance', 'reports:read'),
      ('reporter', 'reports:read')
  )
  select exists (
    select 1
    from user_admin_roles
    join admin_roles on admin_roles.id = user_admin_roles.role_id
    join role_permissions on role_permissions.role_name = admin_roles.name
    where user_admin_roles.user_id = auth.uid()
      and (role_permissions.permission = '*' or role_permissions.permission = input_permission)
  );
$$;

create or replace function assert_admin_permission_rpc(input_permission text)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not has_admin_permission(input_permission) then
    raise exception 'Admin privileges required' using errcode = '42501';
  end if;
end;
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
    select 1
    from products
    where products.id = product_variants.product_id
      and products.status = 'published'
  )
);

create policy "public can read images for published products"
on product_images for select
using (
  exists (
    select 1
    from products
    where products.id = product_images.product_id
      and products.status = 'published'
  )
);

create policy "public can read product category links for published products"
on product_categories for select
using (
  exists (
    select 1
    from products
    where products.id = product_categories.product_id
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
    select 1
    from customers
    where customers.id = addresses.customer_id
      and customers.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from customers
    where customers.id = addresses.customer_id
      and customers.user_id = auth.uid()
  )
);

create policy "customers can read own carts"
on carts for select
using (
  exists (
    select 1
    from customers
    where customers.id = carts.customer_id
      and customers.user_id = auth.uid()
  )
);

create policy "customers can read own cart items"
on cart_items for select
using (
  exists (
    select 1
    from carts
    join customers on customers.id = carts.customer_id
    where carts.id = cart_items.cart_id
      and customers.user_id = auth.uid()
  )
);

create policy "customers can read own orders"
on orders for select
using (
  exists (
    select 1
    from customers
    where customers.id = orders.customer_id
      and customers.user_id = auth.uid()
  )
);

create policy "customers can read own order items"
on order_items for select
using (
  exists (
    select 1
    from orders
    join customers on customers.id = orders.customer_id
    where orders.id = order_items.order_id
      and customers.user_id = auth.uid()
  )
);

create policy "admins can manage admin roles"
on admin_roles for all
using (is_admin())
with check (is_admin());

create policy "admins can manage user admin roles"
on user_admin_roles for all
using (is_admin())
with check (is_admin());

create policy "admins can manage customers"
on customers for all
using (is_admin())
with check (is_admin());

create policy "admins can manage categories"
on categories for all
using (is_admin())
with check (is_admin());

create policy "admins can manage products"
on products for all
using (is_admin())
with check (is_admin());

create policy "admins can manage variants"
on product_variants for all
using (is_admin())
with check (is_admin());

create policy "admins can manage product images"
on product_images for all
using (is_admin())
with check (is_admin());

create policy "admins can manage product categories"
on product_categories for all
using (is_admin())
with check (is_admin());

create policy "admins can manage carts"
on carts for all
using (is_admin())
with check (is_admin());

create policy "admins can manage cart items"
on cart_items for all
using (is_admin())
with check (is_admin());

create policy "admins can manage warehouses"
on warehouses for all
using (is_admin())
with check (is_admin());

create policy "admins can manage lots"
on lots for all
using (is_admin())
with check (is_admin());

create policy "admins can read stock ledger"
on stock_ledger_entries for select
using (is_admin());

create policy "admins can append stock ledger"
on stock_ledger_entries for insert
with check (is_admin());

create policy "admins can read orders"
on orders for select
using (has_admin_permission('orders:read'));

create policy "admins can update orders"
on orders for update
using (has_admin_permission('orders:update'))
with check (has_admin_permission('orders:update'));

create policy "admins can read order items"
on order_items for select
using (has_admin_permission('orders:read'));

create policy "admins can update order items"
on order_items for update
using (has_admin_permission('orders:update'))
with check (has_admin_permission('orders:update'));

create policy "admins can manage stock reservations"
on stock_reservations for all
using (is_admin())
with check (is_admin());

create policy "admins can manage payments"
on payments for all
using (is_admin())
with check (is_admin());

create policy "admins can read audit logs"
on audit_logs for select
using (is_admin());

create policy "admins can append audit logs"
on audit_logs for insert
with check (is_admin());
